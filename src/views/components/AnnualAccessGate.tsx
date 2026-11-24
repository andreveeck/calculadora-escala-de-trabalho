"use client";

import { useEffect, useState } from "react";
import { AnnualCalendarExperience } from "@/src/views/components/AnnualCalendarExperience";
import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/client";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { BrazilDate } from "@/src/shared/date/BrazilDate";

type AccessState =
  | { status: "loading" }
  | { status: "approved" }
  | { status: "denied"; message: string };

interface AnnualAccessGateProps {
  /** Presente quando o token de compartilhamento é válido (server-side). */
  sharedScheduleType?: string;
  sharedReferenceDate?: string;
  /** Token presente na URL, porém expirado, adulterado ou inválido. */
  shareLinkInvalid?: boolean;
}

export function AnnualAccessGate({
  sharedScheduleType,
  sharedReferenceDate,
  shareLinkInvalid = false,
}: AnnualAccessGateProps) {
  const isSharedCalendar =
    isScheduleType(sharedScheduleType) &&
    sharedReferenceDate !== undefined &&
    BrazilDate.isValidIsoDate(sharedReferenceDate);
  const supabase = createBrowserSupabaseClient();
  const [accessState, setAccessState] = useState<AccessState>(() =>
    supabase
      ? { status: "loading" }
      : { status: "denied", message: "Supabase ainda não configurado." },
  );

  useEffect(() => {
    if (isSharedCalendar) {
      return;
    }

    if (!supabase) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          throw new Error("Faça login para acessar o calendário anual.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("access_status")
          .eq("user_id", data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Não foi possível verificar seu acesso.");
        }

        if (profile.access_status !== "approved") {
          throw new Error("Seu pagamento ainda está aguardando liberação.");
        }

        if (active) setAccessState({ status: "approved" });
      } catch (error) {
        if (active) {
          setAccessState({
            status: "denied",
            message:
              error instanceof Error ? error.message : "Acesso não liberado.",
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isSharedCalendar, supabase]);

  if (isSharedCalendar) {
    return (
      <AnnualCalendarExperience
        initialScheduleType={sharedScheduleType}
        initialReferenceDate={sharedReferenceDate}
        readOnly
      />
    );
  }

  if (accessState.status === "loading") {
    return (
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Verificando acesso</p>
          <h1>Aguarde um instante</h1>
        </section>
      </main>
    );
  }

  if (accessState.status === "denied") {
    return (
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Acesso anual</p>
          <h1>
            {shareLinkInvalid
              ? "Link de compartilhamento inválido"
              : "Calendário bloqueado"}
          </h1>
          <p>
            {shareLinkInvalid
              ? "Este link expirou ou não é válido. Entre com sua conta liberada para abrir o calendário anual."
              : accessState.message}
          </p>
          <a className="access-primary-link" href="/acesso">
            Fazer login ou cadastro
          </a>
        </section>
      </main>
    );
  }

  return (
    <AnnualCalendarExperience
      initialScheduleType={sharedScheduleType}
      initialReferenceDate={sharedReferenceDate}
    />
  );
}

function isScheduleType(value: string | undefined): value is ScheduleType {
  return value === "6x1" || value === "12x36" || value === "6x2" || value === "3x3";
}
