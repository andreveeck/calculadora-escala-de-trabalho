import type { Metadata } from "next";
import { AnnualAccessGate } from "@/src/views/components/AnnualAccessGate";

export const metadata: Metadata = {
  title: "Calendário anual | Minha Escala",
  description:
    "Área paga para consultar qualquer período de 12 meses na Minha Escala.",
  robots: {
    index: false,
    follow: false,
  },
};

interface AnnualCalendarPageProps {
  searchParams: Promise<{
    escala?: string;
    referencia?: string;
  }>;
}

export default async function AnnualCalendarPage({
  searchParams,
}: AnnualCalendarPageProps) {
  const { escala, referencia } = await searchParams;

  return (
    <AnnualAccessGate
      initialScheduleType={escala}
      initialReferenceDate={referencia}
    />
  );
}
