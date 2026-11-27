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
        O calendário anual é uma assinatura com pagamento recorrente por período
        de 12 meses. O pagamento não é único: ele libera 12 meses de acesso na
        conta vinculada ao cadastro, contados da confirmação segura do primeiro
        pagamento.
      </p>
      <p>
        A renovação é automática: a cada 12 meses uma nova cobrança é feita para
        manter o acesso. Se a cobrança não for aprovada, o acesso ao calendário
        anual é descontinuado até que o pagamento seja regularizado.
      </p>
    </main>
  );
}
