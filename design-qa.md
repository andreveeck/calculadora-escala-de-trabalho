# Design QA — Minha Escala

## Evidence

- Source visual truth: `D:\Usuarios\Lenovo\Documents\ChatGPT\CALCULADORA ESCALA DE TRABALHO\reference-seo-dream-1440.png`
- Rendered implementation: `D:\Usuarios\Lenovo\Documents\ChatGPT\CALCULADORA ESCALA DE TRABALHO\app-after-redesign-1440.png`
- Responsive implementation: `D:\Usuarios\Lenovo\Documents\ChatGPT\CALCULADORA ESCALA DE TRABALHO\app-after-redesign-mobile.png`
- Combined full-view comparison: `D:\Usuarios\Lenovo\Documents\ChatGPT\CALCULADORA ESCALA DE TRABALHO\design-qa-comparison-1440.png`
- Local route: `http://localhost:3005/`
- Desktop CSS viewport: 1440 × 900 at density 1. Browser-rendered image dimensions: 1425 × 891 for both source and implementation; the difference from the CSS viewport is browser scrollbar/chrome exclusion and is equal for both captures.
- Mobile CSS viewport: 390 × 844 at density 1. Browser-rendered image dimensions: 375 × 812.
- State: home route, light theme, 6x1 selected, reference date `2026-08-20`, calculated result visible.

## Findings

No actionable P0, P1, or P2 visual differences remain. The result intentionally adapts the reference's design language instead of cloning its SEO-specific content.

- Fonts and typography: the reference uses Open Sans; the implementation retains the app's existing Geist family to avoid a new font dependency. The bold display hierarchy, compact labels, body readability, line height, wrapping, and optical weight match the reference's intent. This is an intentional product constraint, not unresolved drift.
- Spacing and layout rhythm: the turquoise header, large above-the-fold composition, generous white space, rounded content container, pill actions, and elevated cards preserve the reference hierarchy. The implementation uses a functional calculator panel where the reference uses an SEO illustration, which is appropriate for the product's primary task.
- Colors and visual tokens: turquoise, cyan, blue, white, orange selection emphasis, and restrained shadows map directly to the supplied reference. Work, rest, warning, and blocked states remain semantically distinguishable.
- Image quality and asset fidelity: the original `contact-bg.jpg` and `banner-dec-right.png` are reused at their intended aspect ratios without stretching or synthetic replacements. SEO-specific team/search illustrations were intentionally omitted because they misrepresent the product. The existing vector favicon remains sharp at header scale.
- Copy and content: all visible copy is specific to work schedules and the annual access flow. No SEO-template placeholder language leaked into the app.
- Icons and controls: the existing brand icon and native date control are aligned consistently. Selected schedule, hover, focus, button, form, blocked-access, and administrative login states remain recognizable.
- Responsiveness and accessibility: desktop and mobile captures show no overlap or hidden persistent control. Mobile schedule choices stack into full-width touch targets. Focus-visible styling, semantic labels, alt text, and existing ARIA attributes remain intact.

## Full-view comparison evidence

The side-by-side file places the 1425 × 891 source capture and the 1425 × 891 implementation capture in the same 2850 × 891 image. It confirms matching art direction across header color, CTA treatment, large display type, blue/turquoise hero surface, organic source imagery, white cards, rounded corners, and overall whitespace. Content placement differs intentionally because the implementation prioritizes calculator controls and status cards over the reference's marketing illustration.

## Focused region evidence

A separate crop was not needed: every adapted reference surface—header, hero typography, primary CTA, schedule cards, background image, and first result cards—is fully visible and readable in the native-resolution above-the-fold comparison. Form, admin, and blocked-access states were also inspected directly in the browser at the same desktop viewport.

## Comparison history

1. Responsive preflight found a P2 risk: the two-column mobile schedule selector could appear clipped and reduce scanability at 390 px. Fix: converted the small-screen selector to full-width stacked cards and re-captured `app-after-redesign-mobile.png`. Post-fix evidence shows all labels and touch targets inside the viewport.
2. Cross-screen review found a P2 contrast risk in the annual summary because it sits outside the blue annual hero. Fix: changed summary cards to white surfaces with brand-blue values and muted labels. The rule now maintains readable contrast independent of the hero image.
3. Final desktop side-by-side comparison found no remaining P0/P1/P2 mismatch. The clean restarted browser session reported no console errors.

## Primary interactions tested

- Switched from 6x1 to 12x36 and recalculated; selected state and result labels updated.
- Opened `/acesso`; cadastro/login controls rendered without changing the auth flow.
- Opened `/admin`; Supabase admin login remained protected and visually intact.
- Opened `/calendario-anual` signed out; the blocked-access state and login link rendered correctly.
- Checked browser console errors after a clean dev-server restart: none.

## Implementation checklist

- [x] Supplied reference captured and compared at the same desktop viewport.
- [x] Source assets reused only where relevant to Minha Escala.
- [x] Desktop and mobile layouts verified.
- [x] Primary calculator and protected-route states verified.
- [x] Typecheck, lint, 23 tests, and production build completed successfully.

## Follow-up polish

- P3: consolidate the legacy CSS and the appended visual-refresh layer in a future maintenance pass. It does not affect the current rendering, but would make later theme changes easier.

final result: passed
