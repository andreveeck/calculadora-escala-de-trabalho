import { scaleMetadata, structuredCalculatorData } from "@/src/views/presenters/seo";
import { ScaleCalculatorPage } from "@/src/views/pages/ScaleCalculatorPage";

export const metadata = scaleMetadata("6x1");

export default function SixByOnePage() {
  return (
    <>
      <ScaleCalculatorPage
        scheduleType="6x1"
        title="Como funciona a escala 6x1"
        description="Na escala 6x1, a referência é uma folga conhecida. A cada sete dias, a mesma posição do ciclo volta a ser folga."
        bullets={[
          "Use uma data em que você realmente folgou.",
          "A calculadora funciona para datas antes e depois da referência.",
          "Viradas de mês e ano usam o mesmo ciclo de sete dias.",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredCalculatorData("Calculadora de Escala 6x1", "/escala-6x1"),
          ),
        }}
      />
    </>
  );
}
