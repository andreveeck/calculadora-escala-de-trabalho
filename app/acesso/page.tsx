import type { Metadata } from "next";
import { AccessFlow } from "@/src/views/components/AccessFlow";

export const metadata: Metadata = {
  title: "Acesso anual | Minha Escala",
  description: "Cadastro e pagamento do calendário anual da Minha Escala.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccessPage() {
  return <AccessFlow />;
}
