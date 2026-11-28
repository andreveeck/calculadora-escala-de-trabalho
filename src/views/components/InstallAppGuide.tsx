"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

type Platform =
  | "chrome-android"
  | "samsung"
  | "chrome-desktop"
  | "ios"
  | "firefox"
  | "other";

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  "chrome-android": {
    title: "Chrome no Android",
    steps: [
      "Toque no menu ⋮ no canto superior direito do Chrome.",
      "Toque em \u201cInstalar e criar atalho\u201d (em versões antigas: \u201cAdicionar à tela inicial\u201d).",
      "Confirme em \u201cInstalar\u201d no aviso que aparece na parte de baixo.",
      "O ícone \u201cMinha Escala\u201d entra na tela inicial. Abra por ele: o app abre em tela cheia, sem a barra de endereço.",
    ],
  },
  samsung: {
    title: "Samsung Internet",
    steps: [
      "Toque no menu ≡ no canto inferior direito.",
      "Toque em \u201cAdicionar página a\u201d e depois em \u201cTela inicial\u201d.",
      "Confirme em \u201cAdicionar\u201d.",
      "Abra o ícone \u201cMinha Escala\u201d criado na tela inicial.",
    ],
  },
  "chrome-desktop": {
    title: "Chrome no computador",
    steps: [
      "Clique no ícone de instalação (um monitor com seta) na barra de endereço, à direita da URL.",
      "Se o ícone não aparecer: menu ⋮ → \u201cSalvar e compartilhar\u201d → \u201cInstalar página como app...\u201d.",
      "Clique em \u201cInstalar\u201d.",
      "O app abre em uma janela própria e o atalho fica no menu Iniciar e na área de trabalho.",
    ],
  },
  ios: {
    title: "Safari no iPhone / iPad",
    steps: [
      "Abra esta página no Safari (no iOS só o Safari cria atalho em tela cheia).",
      "Toque no botão Compartilhar (quadrado com uma seta para cima).",
      "Role e toque em \u201cAdicionar à Tela de Início\u201d.",
      "Toque em \u201cAdicionar\u201d. O ícone aparece na tela inicial e abre em tela cheia.",
    ],
  },
  firefox: {
    title: "Firefox",
    steps: [
      "O Firefox não instala atalho que abre em tela cheia.",
      "Abra esta página no Chrome (Android) ou no Chrome/Edge (computador) e siga o passo a passo de lá.",
    ],
  },
  other: {
    title: "Seu navegador",
    steps: [
      "Abra o menu do navegador (três pontos ou três barras).",
      "Procure por \u201cInstalar app\u201d, \u201cInstalar e criar atalho\u201d ou \u201cAdicionar à tela inicial\u201d.",
      "Confirme a instalação.",
      "Se não encontrar, abra esta página no Chrome para instalar em tela cheia.",
    ],
  },
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "other";
  }

  const ua = navigator.userAgent;

  if (/SamsungBrowser/i.test(ua)) {
    return "samsung";
  }

  if (/Firefox|FxiOS/i.test(ua)) {
    return "firefox";
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "ios";
  }

  // iPadOS moderno se identifica como Mac, mas tem toque.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) {
    return "ios";
  }

  if (/Android/i.test(ua) && /Chrome|CriOS/i.test(ua)) {
    return "chrome-android";
  }

  if (/Chrome|CriOS|Edg/i.test(ua)) {
    return "chrome-desktop";
  }

  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS usa uma propriedade própria, fora do padrão.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// O evento "beforeinstallprompt" pode disparar antes de qualquer componente
// montar, e é de uso único. Por isso ele fica guardado no escopo do módulo.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let appInstalled = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sem isto o Chrome mostra o banner nativo e o evento se perde.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    appInstalled = true;
    deferredPrompt = null;
    notifySubscribers();
  });
}

export function InstallAppGuide() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setPlatform(detectPlatform());
      setCanPrompt(deferredPrompt !== null);
      setInstalled(appInstalled || isStandalone());
    };

    sync();
    subscribers.add(sync);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener?.("change", sync);

    return () => {
      subscribers.delete(sync);
      mediaQuery.removeEventListener?.("change", sync);
    };
  }, []);

  const handleClick = useCallback(async () => {
    const promptEvent = deferredPrompt;

    // Quando o navegador permite, um único toque abre o instalador nativo.
    if (promptEvent) {
      // O evento só funciona uma vez; descartamos depois do uso.
      deferredPrompt = null;
      setCanPrompt(false);
      setFeedback(null);

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        if (choice.outcome === "accepted") {
          setFeedback("Instalação iniciada. O ícone vai aparecer na tela inicial.");
          setOpen(false);
        } else {
          setFeedback(
            "Instalação cancelada. Toque de novo no botão para abrir o passo a passo.",
          );
        }
      } catch {
        setFeedback(
          "Não foi possível abrir o instalador. Siga o passo a passo abaixo.",
        );
        setOpen(true);
      }

      return;
    }

    setFeedback(null);
    setOpen((current) => !current);
  }, []);

  if (installed) {
    return null;
  }

  const guide = STEPS[platform];

  return (
    <section className="install-app" aria-labelledby="install-app-title">
      <div className="install-app-head">
        <div>
          <h2 id="install-app-title">Use como aplicativo</h2>
          <p>
            Instale a Minha Escala no celular ou no computador para abrir em tela
            cheia, direto pelo ícone, sem digitar o endereço.
          </p>
        </div>
        <button
          type="button"
          className="install-app-toggle"
          aria-expanded={open}
          aria-controls="install-app-steps"
          onClick={handleClick}
        >
          {canPrompt ? "Instalar aplicativo" : "Instalar e criar atalho"}
        </button>
      </div>

      {feedback ? (
        <p className="install-app-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {open ? (
        <div className="install-app-body" id="install-app-steps">
          <p className="install-app-note">
            Este navegador não abre o instalador direto pela página. Siga o passo
            a passo:
          </p>

          <h3>{guide.title}</h3>
          <ol className="install-app-steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
