from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", BASE_DIR / "minha_escala.sqlite3"))
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8787"))
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "troque-este-token")
PAGSEGURO_PAYMENT_URL = os.environ.get("PAGSEGURO_PAYMENT_URL", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


def now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
  connection = sqlite3.connect(DATABASE_PATH)
  connection.row_factory = sqlite3.Row
  connection.execute("PRAGMA foreign_keys = ON")
  return connection


def init_database() -> None:
  DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
  with connect() as connection:
    connection.executescript(
      """
      create table if not exists users (
        id integer primary key autoincrement,
        name text not null,
        email text not null unique,
        password_hash text not null,
        password_salt text not null,
        access_status text not null default 'pending_payment'
          check (access_status in ('pending_payment', 'approved', 'blocked')),
        created_at text not null,
        updated_at text not null
      );

      create table if not exists sessions (
        token text primary key,
        user_id integer not null references users(id) on delete cascade,
        created_at text not null
      );
      """
    )


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
  password_salt = salt or secrets.token_hex(16)
  digest = hashlib.pbkdf2_hmac(
    "sha256",
    password.encode("utf-8"),
    password_salt.encode("utf-8"),
    120_000,
  ).hex()
  return digest, password_salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
  digest, _ = hash_password(password, salt)
  return hmac.compare_digest(digest, password_hash)


def row_to_user(row: sqlite3.Row) -> dict[str, Any]:
  return {
    "id": row["id"],
    "name": row["name"],
    "email": row["email"],
    "accessStatus": row["access_status"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
  }


def create_session(connection: sqlite3.Connection, user_id: int) -> str:
  token = secrets.token_urlsafe(32)
  connection.execute(
    "insert into sessions (token, user_id, created_at) values (?, ?, ?)",
    (token, user_id, now_iso()),
  )
  return token


class MinhaEscalaApi(BaseHTTPRequestHandler):
  server_version = "MinhaEscalaApi/0.1"

  def do_OPTIONS(self) -> None:
    self.send_response(204)
    self.send_cors_headers()
    self.end_headers()

  def do_GET(self) -> None:
    parsed = urlparse(self.path)

    if parsed.path == "/health":
      self.respond(200, {"ok": True})
      return

    if parsed.path == "/auth/me":
      self.handle_me()
      return

    if parsed.path == "/admin/users":
      self.handle_admin_users()
      return

    self.respond(404, {"message": "Rota não encontrada."})

  def do_POST(self) -> None:
    parsed = urlparse(self.path)

    if parsed.path == "/auth/register":
      self.handle_register()
      return

    if parsed.path == "/auth/login":
      self.handle_login()
      return

    if parsed.path.startswith("/admin/users/") and parsed.path.endswith("/release"):
      user_id = parsed.path.split("/")[3]
      self.handle_release_user(user_id)
      return

    self.respond(404, {"message": "Rota não encontrada."})

  def handle_register(self) -> None:
    body = self.read_json()
    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))

    if len(name) < 2:
      self.respond(400, {"message": "Informe seu nome."})
      return

    if "@" not in email:
      self.respond(400, {"message": "Informe um e-mail válido."})
      return

    if len(password) < 6:
      self.respond(400, {"message": "Use uma senha com pelo menos 6 caracteres."})
      return

    password_hash, salt = hash_password(password)

    try:
      with connect() as connection:
        cursor = connection.execute(
          """
          insert into users
            (name, email, password_hash, password_salt, access_status, created_at, updated_at)
          values (?, ?, ?, ?, 'pending_payment', ?, ?)
          """,
          (name, email, password_hash, salt, now_iso(), now_iso()),
        )
        token = create_session(connection, int(cursor.lastrowid))
        user = connection.execute(
          "select * from users where id = ?",
          (cursor.lastrowid,),
        ).fetchone()
    except sqlite3.IntegrityError:
      self.respond(409, {"message": "Este e-mail já está cadastrado."})
      return

    self.respond(201, self.auth_payload(token, row_to_user(user)))

  def handle_login(self) -> None:
    body = self.read_json()
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))

    with connect() as connection:
      user = connection.execute(
        "select * from users where email = ?",
        (email,),
      ).fetchone()

      if not user or not verify_password(password, user["password_hash"], user["password_salt"]):
        self.respond(401, {"message": "E-mail ou senha incorretos."})
        return

      token = create_session(connection, int(user["id"]))

    self.respond(200, self.auth_payload(token, row_to_user(user)))

  def handle_me(self) -> None:
    session = self.require_session()
    if not session:
      return

    self.respond(200, self.auth_payload(session["token"], row_to_user(session)))

  def handle_admin_users(self) -> None:
    if not self.require_admin():
      return

    with connect() as connection:
      users = connection.execute(
        """
        select id, name, email, access_status, created_at, updated_at
        from users
        order by
          case access_status when 'pending_payment' then 0 when 'approved' then 1 else 2 end,
          created_at desc
        """
      ).fetchall()

    self.respond(200, {"users": [row_to_user(user) for user in users]})

  def handle_release_user(self, raw_user_id: str) -> None:
    if not self.require_admin():
      return

    try:
      user_id = int(raw_user_id)
    except ValueError:
      self.respond(400, {"message": "Usuário inválido."})
      return

    with connect() as connection:
      connection.execute(
        "update users set access_status = 'approved', updated_at = ? where id = ?",
        (now_iso(), user_id),
      )
      user = connection.execute(
        "select id, name, email, access_status, created_at, updated_at from users where id = ?",
        (user_id,),
      ).fetchone()

    if not user:
      self.respond(404, {"message": "Usuário não encontrado."})
      return

    self.respond(200, {"user": row_to_user(user)})

  def auth_payload(self, token: str, user: dict[str, Any]) -> dict[str, Any]:
    return {
      "token": token,
      "user": user,
      "paymentUrl": PAGSEGURO_PAYMENT_URL,
      "hasPaymentLink": bool(PAGSEGURO_PAYMENT_URL),
    }

  def require_session(self) -> sqlite3.Row | None:
    authorization = self.headers.get("Authorization", "")
    token = authorization.replace("Bearer ", "", 1).strip()

    if not token:
      self.respond(401, {"message": "Faça login para continuar."})
      return None

    with connect() as connection:
      session = connection.execute(
        """
        select sessions.token, users.id, users.name, users.email, users.access_status,
               users.created_at, users.updated_at
        from sessions
        join users on users.id = sessions.user_id
        where sessions.token = ?
        """,
        (token,),
      ).fetchone()

    if not session:
      self.respond(401, {"message": "Sessão expirada. Faça login novamente."})
      return None

    return session

  def require_admin(self) -> bool:
    token = self.headers.get("X-Admin-Token", "")
    if not ADMIN_TOKEN or ADMIN_TOKEN == "troque-este-token" or token != ADMIN_TOKEN:
      self.respond(401, {"message": "Acesso administrativo não autorizado."})
      return False

    return True

  def read_json(self) -> dict[str, Any]:
    content_length = int(self.headers.get("Content-Length", "0"))
    if content_length == 0:
      return {}

    raw_body = self.rfile.read(content_length).decode("utf-8")
    return json.loads(raw_body)

  def respond(self, status: int, payload: dict[str, Any]) -> None:
    encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    self.send_response(status)
    self.send_cors_headers()
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(encoded)))
    self.end_headers()
    self.wfile.write(encoded)

  def send_cors_headers(self) -> None:
    self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Admin-Token")

  def log_message(self, format: str, *args: Any) -> None:
    print(f"[{now_iso()}] {self.address_string()} {format % args}")


def main() -> None:
  init_database()
  server = ThreadingHTTPServer((HOST, PORT), MinhaEscalaApi)
  print(f"Minha Escala API rodando em http://{HOST}:{PORT}")
  print(f"Banco SQLite: {DATABASE_PATH}")
  server.serve_forever()


if __name__ == "__main__":
  main()
