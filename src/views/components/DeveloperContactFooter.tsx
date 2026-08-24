"use client";

import type { MouseEvent } from "react";
import { DEVELOPER_CONTACT } from "@/src/lib/constants";

interface DeveloperContactFooterProps {
  appName: string;
}

export function DeveloperContactFooter({
  appName,
}: DeveloperContactFooterProps) {
  function refreshContactLink(event: MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.href = DEVELOPER_CONTACT.getLink(appName);
  }

  return (
    <footer className="developer-contact-footer" aria-label="Contato do desenvolvedor">
      <div>
        <span>Desenvolvido por André Veeck</span>
        <a
          href={DEVELOPER_CONTACT.getLink(appName)}
          target="_blank"
          rel="noreferrer"
          onClick={refreshContactLink}
          suppressHydrationWarning
        >
          Falar com o desenvolvedor no WhatsApp
        </a>
      </div>
    </footer>
  );
}
