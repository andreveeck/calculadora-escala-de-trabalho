import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso | Minha Escala",
  description: "Termos de uso da Minha Escala.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <h1>Termos de uso</h1>
      <p>
        A Minha Escala ajuda a estimar dias de trabalho e folga a partir da data
        de referência informada pelo usuário. Confira a escala oficial da sua
        empresa em caso de dúvida.
      </p>
      <p>
        O calendário anual pago tem pagamento único e acesso vitalício para a
        conta vinculada após confirmação segura do pagamento.
      </p>
    </main>
  );
}
