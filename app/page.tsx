import type { Metadata } from "next";
import { ScaleCalculatorPage } from "@/src/views/pages/ScaleCalculatorPage";

export const metadata: Metadata = {
  title: "Minha Escala | Calculadora de escalas de trabalho",
  description:
    "Calcule escalas 6x1, 12x36, 6x2 e 3x3. Veja hoje, amanhã, próxima folga e calendário mensal gratuito.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
      <ScaleCalculatorPage
        scheduleType="6x1"
        title="Planeje sua rotina com mais segurança"
        description="Veja rapidamente quando você trabalha, quando folga e qual será sua próxima pausa."
        bullets={[
          "Sem cadastro.",
          "Resultado imediato.",
          "Escalas 6x1, 6x2, 12x36 e 3x3.",
        ]}
      />
  );
}
