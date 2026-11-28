# Instalação como aplicativo (PWA) — escopo completo

Documento de referência do botão **"Instalar e criar atalho"** / **"Instalar aplicativo"** da Minha Escala.

Resumo: o botão vive em um único componente cliente, `InstallAppGuide`. Ele usa o evento `beforeinstallprompt` (Chromium) para abrir o instalador nativo em **um único toque** e, quando esse evento não existe (iOS, Firefox, navegador sem critérios de instalabilidade), abre um **passo a passo numerado** por navegador.

---

## 1. Arquivos envolvidos

| Arquivo | Papel |
| --- | --- |
| `src/views/components/InstallAppGuide.tsx` | Componente cliente: captura do evento, botão, guia por navegador, feedback. |
| `app/manifest.ts` | Manifest PWA (Metadata Route do App Router). |
| `app/layout.tsx` | `manifest`, `applicationName`, `appleWebApp`, ícones e `viewport.themeColor`. |
| `src/views/pages/ScaleCalculatorPage.tsx` | Onde o componente é montado (topo da página, acima do cálculo). |
| `app/globals.css` | Bloco `/* Instalacao do app (PWA) */` — classes `.install-app*`. |
| `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`, `public/apple-touch-icon.png` | Ícones exigidos pelo manifest / iOS. |

---

## 2. Componente completo — `src/views/components/InstallAppGuide.tsx`

```tsx
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
      "Toque em “Instalar e criar atalho” (em versões antigas: “Adicionar à tela inicial”).",
      "Confirme em “Instalar” no aviso que aparece na parte de baixo.",
      "O ícone “Minha Escala” entra na tela inicial. Abra por ele: o app abre em tela cheia, sem a barra de endereço.",
    ],
  },
  samsung: {
    title: "Samsung Internet",
    steps: [
      "Toque no menu ≡ no canto inferior direito.",
      "Toque em “Adicionar página a” e depois em “Tela inicial”.",
      "Confirme em “Adicionar”.",
      "Abra o ícone “Minha Escala” criado na tela inicial.",
    ],
  },
  "chrome-desktop": {
    title: "Chrome no computador",
    steps: [
      "Clique no ícone de instalação (um monitor com seta) na barra de endereço, à direita da URL.",
      "Se o ícone não aparecer: menu ⋮ → “Salvar e compartilhar” → “Instalar página como app...”.",
      "Clique em “Instalar”.",
      "O app abre em uma janela própria e o atalho fica no menu Iniciar e na área de trabalho.",
    ],
  },
  ios: {
    title: "Safari no iPhone / iPad",
    steps: [
      "Abra esta página no Safari (no iOS só o Safari cria atalho em tela cheia).",
      "Toque no botão Compartilhar (quadrado com uma seta para cima).",
      "Role e toque em “Adicionar à Tela de Início”.",
      "Toque em “Adicionar”. O ícone aparece na tela inicial e abre em tela cheia.",
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
      "Procure por “Instalar app”, “Instalar e criar atalho” ou “Adicionar à tela inicial”.",
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

// Navegadores em que o instalador nativo existe quando o Chrome/Chromium
// libera o evento. Serve para separar "ainda não disparou" de "não existe".
function isChromium(platform: Platform): boolean {
  return (
    platform === "chrome-android" ||
    platform === "chrome-desktop" ||
    platform === "samsung"
  );
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

  // O texto do guia depende do evento, mas só aparece depois do clique — nunca
  // no HTML do servidor, então não há divergência na hidratação.
  const guideIntro = canPrompt
    ? "Siga o passo a passo:"
    : isChromium(platform)
      ? "O navegador não liberou o instalador automático para esta página (ele exige HTTPS e algum uso do site). Instale pelo menu:"
      : "Este navegador não abre o instalador direto pela página. Siga o passo a passo:";

  return (
    <section className="install-app" aria-labelledby="install-app-title">
      <div className="install-app-head">
        <div>
          <h2 id="install-app-title">Use como aplicativo</h2>
          <p>
            Abra em tela cheia, direto pelo ícone, sem digitar o endereço.
          </p>
        </div>
        <button
          type="button"
          className="install-app-toggle"
          aria-expanded={open}
          aria-controls="install-app-steps"
          onClick={handleClick}
        >
          Instalar aplicativo
        </button>
      </div>

      {feedback ? (
        <p className="install-app-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {open ? (
        <div className="install-app-body" id="install-app-steps">
          <p className="install-app-note">{guideIntro}</p>

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
```

---

## 3. A função do botão, isolada

```tsx
const handleClick = useCallback(async () => {
  const promptEvent = deferredPrompt;

  if (promptEvent) {
    deferredPrompt = null;      // evento é de uso único
    setCanPrompt(false);
    setFeedback(null);

    try {
      await promptEvent.prompt();          // abre o diálogo nativo do Chrome
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

    return;                     // não abre o guia quando o prompt respondeu
  }

  setFeedback(null);
  setOpen((current) => !current);   // fallback: alterna o passo a passo
}, []);
```

Fluxo em ordem:

1. Chrome avalia instalabilidade (HTTPS + manifest + ícones + `display` standalone).
2. Se instalável, dispara `beforeinstallprompt` → `preventDefault()` + guarda o evento no módulo.
3. Toque no botão → se há evento, `prompt()` é chamado imediatamente (sem segundo clique).
4. `userChoice` informa `accepted` / `dismissed`; o Chrome instala e dispara `appinstalled`.
5. `appinstalled` → seção desaparece (`if (installed) return null`).
6. Sem evento → o mesmo botão abre o passo a passo do navegador detectado.

---

## 4. Manifest — `app/manifest.ts`

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Escala — Calculadora de Escala de Trabalho",
    short_name: "Minha Escala",
    description:
      "Calcule seus dias de trabalho e folga em escalas 12x36, 6x2, 3x3 e 6x1.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f5f9f8",
    theme_color: "#146b5f",
    lang: "pt-BR",
    prefer_related_applications: false,
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

> Não há `orientation`: fixar `portrait-primary` travava a rotação no Android.

---

## 5. Metadata no layout — `app/layout.tsx`

```ts
export const metadata: Metadata = {
  // ...
  manifest: "/manifest.webmanifest",
  applicationName: "Minha Escala",
  appleWebApp: {
    capable: true,
    title: "Minha Escala",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#146b5f",
};
```

---

## 6. Montagem — `src/views/pages/ScaleCalculatorPage.tsx`

```tsx
<main className="site-content">
  <InstallAppGuide />
  <ScheduleCalculator initialScheduleType={scheduleType} />
  {/* ... */}
</main>
```

Fica no topo, logo abaixo do cabeçalho. Antes estava depois do cálculo e caía a ~3068 px de altura numa página de ~3983 px — o botão existia, mas nunca aparecia sem rolar até o fim.

---

## 7. Estilos — bloco em `app/globals.css`

```css
/* Instalacao do app (PWA) */
.install-app {
  width: min(1160px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 10px 26px rgba(33, 88, 150, 0.08);
}

.install-app-head {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
}

.install-app-head h2 {
  margin: 0 0 2px;
  color: var(--brand-strong);
  font-size: 0.95rem;
}

.install-app-head p {
  margin: 0;
  max-width: 56ch;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.4;
}

.install-app-toggle {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: var(--accent-strong);
  color: #ffffff;
  font-weight: 800;
  white-space: nowrap;
}

.install-app-toggle:hover {
  background: #249d5b;
}

.install-app-body {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.install-app-body h3 {
  margin: 14px 0 8px;
  color: var(--foreground);
  font-size: 0.95rem;
}

.install-app-steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 22px;
  color: var(--foreground);
  font-size: 0.94rem;
  line-height: 1.5;
}

.install-app-steps li::marker {
  color: var(--accent-strong);
  font-weight: 800;
}

.install-app-note {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.install-app-feedback {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-size: 0.9rem;
  font-weight: 700;
}

@media (max-width: 640px) {
  .install-app-toggle {
    width: 100%;
  }
}
```

---

## 8. Regras e limitações

- **Só Chromium dispara `beforeinstallprompt`.** Safari/iOS e Firefox nunca disparam — nesses navegadores o atalho só sai pelo menu do próprio navegador, e nenhuma API permite automatizar isso.
- **O rótulo do botão é fixo em "Instalar aplicativo" e não depende do evento.** `beforeinstallprompt` não existe no servidor, então um rótulo derivado dele nasceria errado no HTML e piscaria na hidratação. O que muda por navegador é o texto do guia, que só entra no DOM depois do clique.
- **"Evento não disparou" ≠ "navegador sem instalador".** O guia separa os dois casos: em Chromium (Chrome/Edge/Samsung) a nota diz que o navegador não liberou o instalador automático para aquela página (exige HTTPS e algum uso) e manda usar o menu; em Safari/Firefox diz que o instalador pela página não existe ali.
- **Não é possível automatizar o menu ⋮ do Chrome.** O navegador não expõe nenhuma API para isso; `prompt()` é o único caminho programático.
- **O evento é de uso único.** Depois do primeiro `prompt()`, chamá-lo de novo não abre nada.
- **Exige HTTPS ou localhost.** Em `http://` de rede local (ex.: `http://192.168.x.x`) o Chrome não considera instalável.
- **Não funciona dentro de iframe.**
- **Não há service worker de propósito.** Não é mais obrigatório (removido no Chrome 108/112) e é fonte clássica de cache velho no Next.js.
- **Critérios de instalabilidade:** `name`/`short_name`, `start_url`, `display` standalone/fullscreen/minimal-ui, ícones 192 e 512, `prefer_related_applications: false`.
- **Publicar não é deploy.** `git push` entrega o código ao GitHub; o site só muda depois que o deploy (Vercel/Cloudflare) rodar.

---

## 9. Como testar de verdade

1. Publique em HTTPS (ou use `localhost`, que conta como seguro).
2. Abra no **Chrome Android** e recarregue duas vezes (o Chrome exige sinais mínimos de engajamento).
3. O rótulo deve virar **"Instalar aplicativo"** — um toque abre o diálogo nativo.
4. Aceite: o ícone entra na tela inicial e, aberto por ele, o app deve rodar em tela cheia **e rotacionar** nos dois sentidos.
5. Para reconferir do zero: Chrome → Configurações → Apps → Minha Escala → Desinstalar; ou limpar os dados do site.
