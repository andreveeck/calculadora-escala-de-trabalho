const vpsApiUrl = process.env.VPS_API_URL;
const adminToken = process.env.VPS_ADMIN_TOKEN;

export function isVpsApiConfigured(): boolean {
  return Boolean(vpsApiUrl);
}

export async function requestVpsApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!vpsApiUrl) {
    throw new Error("API da VPS ainda não configurada.");
  }

  const response = await fetch(`${vpsApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Não foi possível concluir a solicitação.");
  }

  return payload;
}

export function getAdminToken(): string {
  if (!adminToken) {
    throw new Error("Token administrativo da VPS ainda não configurado.");
  }

  return adminToken;
}
