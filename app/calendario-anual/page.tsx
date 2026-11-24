import type { Metadata } from "next";
import { AnnualAccessGate } from "@/src/views/components/AnnualAccessGate";
import { verifyShareToken } from "@/src/shared/tokens/calendarShareToken";

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
    token?: string;
  }>;
}

export default async function AnnualCalendarPage({
  searchParams,
}: AnnualCalendarPageProps) {
  const { token } = await searchParams;

  // Tokens assinados pelo servidor são a única forma de acessar
  // o calendário compartilhado sem login. Parâmetros de URL em
  // texto puro (escala/referencia) não são mais aceitos, e token
  // expirado/adulterado cai no fluxo normal de login/pagamento.
  const sharedParams = token ? verifyShareToken(token) : null;
  const shareLinkInvalid = Boolean(token) && !sharedParams;

  return (
    <AnnualAccessGate
      sharedScheduleType={sharedParams?.scheduleType}
      sharedReferenceDate={sharedParams?.referenceDate}
      shareLinkInvalid={shareLinkInvalid}
    />
  );
}
