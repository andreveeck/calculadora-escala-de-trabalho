# API SQLite da Minha Escala

API provisória para validar cadastro, login, pagamento manual via PagSeguro e liberação de acesso pelo admin.

## Variáveis

```bash
export ADMIN_TOKEN="troque-por-um-token-forte"
export PAGSEGURO_PAYMENT_URL="https://pagseguro.uol.com.br/..."
export ALLOWED_ORIGIN="http://localhost:3000"
export PORT="8787"
python3 server.py
```

## Rotas

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /admin/users`
- `POST /admin/users/:id/release`
