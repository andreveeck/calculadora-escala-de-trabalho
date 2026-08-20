import { scaleMetadata, structuredCalculatorData } from "@/src/views/presenters/seo";
import { ScaleCalculatorPage } from "@/src/views/pages/ScaleCalculatorPage";

export const metadata = scaleMetadata("6x2");

export default function SixByTwoPage() {
  return (
    <>
      <ScaleCalculatorPage
        scheduleType="6x2"
        title="Como funciona a escala 6x2"
        description="Na escala 6x2, a referência é o primeiro dia de trabalho depois das duas folgas. O ciclo tem oito dias."
        bullets={[
          "Seis dias seguidos aparecem como trabalho.",
          "Os dois últimos dias do ciclo aparecem como folga.",
          "Datas antigas usam módulo positivo para manter o ciclo correto.",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            structuredCalculatorData("Calculadora de Escala 6x2", "/escala-6x2"),
          ),
        }}
      />
    </>
  );
}
