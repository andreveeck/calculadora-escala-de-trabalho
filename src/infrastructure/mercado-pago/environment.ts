export interface MercadoPagoEnvironment {
  accessToken: string;
  webhookSecret: string;
  appUrl: string;
}

export function getMercadoPagoEnvironment(): MercadoPagoEnvironment | null {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!accessToken || !webhookSecret || !appUrl) {
    return null;
  }

  return { accessToken, webhookSecret, appUrl };
}
