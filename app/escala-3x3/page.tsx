import { scaleMetadata, structuredCalculatorData } from "@/src/views/presenters/seo";
import { ScaleCalculatorPage } from "@/src/views/pages/ScaleCalculatorPage";

export const metadata = scaleMetadata("3x3");

export default function ThreeByThreePage() {
  return (
    <>
      <ScaleCalculatorPage
        scheduleType="3x3"
        title="Como funciona a escala 3x3"
        description="Na escala 3x3, a referência é o primeiro dia de trabalho do ciclo. Depois de três dias trabalhados, entram três dias de folga."
        bullets={[
          "Três dias seguidos aparecem como trabalho.",
          "Os três dias seguintes aparecem como folga.",
          "O ciclo de seis dias funciona para datas futuras e passadas.",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredCalculatorData("Calculadora de Escala 3x3", "/escala-3x3"),
          ),
        }}
      />
    </>
  );
}
