import { scaleMetadata, structuredCalculatorData } from "@/src/views/presenters/seo";
import { ScaleCalculatorPage } from "@/src/views/pages/ScaleCalculatorPage";

export const metadata = scaleMetadata("12x36");

export default function TwelveByThirtySixPage() {
  return (
    <>
      <ScaleCalculatorPage
        scheduleType="12x36"
        title="Como funciona a escala 12x36"
        description="Na escala 12x36, informe o dia em que um plantão começou. O próximo plantão acontece dois dias depois."
        bullets={[
          "O dia da referência aparece como dia de trabalho.",
          "O dia seguinte aparece como folga.",
          "O cálculo usa datas sem horário para evitar erro de fuso.",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredCalculatorData(
              "Calculadora de Escala 12x36",
              "/escala-12x36",
            ),
          ),
        }}
      />
    </>
  );
}
