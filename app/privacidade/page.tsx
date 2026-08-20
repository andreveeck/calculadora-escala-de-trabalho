import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade | Minha Escala",
  description: "Política de privacidade da Minha Escala.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <h1>Privacidade</h1>
      <p>
        Coletamos apenas os dados necessários para calcular escalas, capturar contatos
        com consentimento, processar pagamentos e preservar acesso pago.
      </p>
      <p>
        Segredos de pagamento e chaves administrativas ficam somente no servidor.
        Eventos internos evitam senhas, tokens e dados pessoais desnecessários.
      </p>
    </main>
  );
}
