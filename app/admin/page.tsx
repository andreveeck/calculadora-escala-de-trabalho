import type { Metadata } from "next";
import { AdminPanel } from "@/src/views/components/AdminPanel";

export const metadata: Metadata = {
  title: "Admin | Minha Escala",
  description: "Painel administrativo protegido da Minha Escala.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminPanel />;
}
