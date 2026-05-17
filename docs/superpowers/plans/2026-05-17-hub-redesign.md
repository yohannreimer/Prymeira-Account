# Prymeira Hub — Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign visual completo das três telas do Prymeira Hub (Login, Hub autenticado, Admin Panel) aplicando o branding oficial da Prymeira com paleta monocromática, tipografia Playfair Display + Inter, padrão topográfico e ícones Lucide.

**Architecture:** Substituição completa do CSS design system + redesign dos componentes React existentes. Toda a lógica de negócio (fetch de dados, Clerk auth, admin actions) é preservada intacta — apenas markup e estilos são alterados. O projeto usa CSS vanilla com variáveis CSS, sem Tailwind.

**Tech Stack:** React 19, Vite, Clerk 5 (`@clerk/clerk-react`), Lucide React, TypeScript, CSS vanilla

---

## Mapa de Arquivos

| Arquivo | Operação | Responsabilidade |
|---------|----------|------------------|
| `apps/hub-web/index.html` | Modify | Adicionar Google Fonts (Playfair Display + Inter) + title |
| `apps/hub-web/src/styles.css` | Replace | Design system completo: tokens, reset, topbar, hero, cards, admin, login |
| `apps/hub-web/src/App.tsx` | Modify | Redesign de `Landing`, `Hub`, `ProductCard`, `LoadingProducts` |
| `apps/hub-web/src/AdminPanel.tsx` | Modify | Redesign do markup do painel admin (3 colunas) |

---

## Task 1: Google Fonts + meta

**Files:**
- Modify: `apps/hub-web/index.html`

- [ ] **Step 1: Substituir o arquivo index.html**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#faf8f3" />
    <title>Prymeira Hub</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Verificar no browser**

Abra `http://localhost:5173` (ou o port do Vite). Inspecione o `<head>` no DevTools e confirme que as duas fontes Playfair Display e Inter aparecem na aba Network.

- [ ] **Step 3: Commit**

```bash
git add apps/hub-web/index.html
git commit -m "feat(hub-web): add Playfair Display + Inter via Google Fonts"
```

---

## Task 2: Novo design system — styles.css

**Files:**
- Replace: `apps/hub-web/src/styles.css`

- [ ] **Step 1: Substituir styles.css completo**

Substitua TODO o conteúdo do arquivo pelo CSS abaixo:

```css
/* ─── TOKENS ─── */
:root {
  --gold:    #FCC009;
  --black:   #0c0c0c;
  --white:   #ffffff;
  --cream:   #faf8f3;
  --surface: #fafafa;
  --ink:     #171717;
  --dim:     #525252;
  --muted:   #a3a3a3;
  --faint:   #d4d4d4;
  --rule:    #e5e5e5;

  --green:   #16a34a;
  --green-s: #f0fdf4;
  --blue-s:  #f0f9ff;
  --blue-t:  #0369a1;
  --amber-s: #fef3c7;
  --amber-t: #92400e;
  --red:     #dc2626;
  --red-s:   #fee2e2;

  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans:  'Inter', system-ui, sans-serif;

  --radius-sm: 6px;
  --radius:    8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 14px;
}

/* ─── RESET ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; }
body { font-family: var(--font-sans); background: var(--cream); color: var(--ink); }
button { font-family: var(--font-sans); cursor: pointer; border: none; background: none; }
a { text-decoration: none; color: inherit; }
img { display: block; max-width: 100%; }

/* ─── LOADING / FULL-PAGE STATES ─── */
.page-loading {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
}
.page-loading__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.page-loading__spin {
  animation: spin 1.2s linear infinite;
  color: var(--faint);
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── SHELL ─── */
.shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ─── TOPBAR ─── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--white);
  border-bottom: 1px solid var(--rule);
  height: 60px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 0;
}
.topbar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 28px;
  flex-shrink: 0;
}
.topbar__logomark {
  width: 32px;
  height: 32px;
  background: var(--gold);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.topbar__logotype {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--black);
  letter-spacing: -0.3px;
}
.topbar__sep {
  width: 1px;
  height: 20px;
  background: var(--rule);
  margin: 0 20px;
  flex-shrink: 0;
}
.topbar__workspace {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
  flex-shrink: 0;
}
.topbar__ws-dot {
  width: 7px;
  height: 7px;
  background: var(--green);
  border-radius: 50%;
  flex-shrink: 0;
}
.topbar__nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 24px;
}
.topbar__nav-item {
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  color: var(--dim);
  transition: background 0.1s;
}
.topbar__nav-item--active {
  background: var(--gold);
  color: var(--black);
  font-weight: 600;
}
.topbar__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.topbar__icon-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: border-color 0.1s;
}
.topbar__icon-btn:hover { border-color: var(--faint); color: var(--dim); }
.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 22px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.topbar__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--black);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--gold);
  flex-shrink: 0;
}
.topbar__admin-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--black);
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.topbar__back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 500;
  color: var(--dim);
  background: var(--surface);
}
.topbar__back-btn:hover { border-color: var(--faint); }

/* ─── TOPO PATTERN (SVG inline) ─── */
.topo-pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ─── HUB HERO ─── */
.hub-hero {
  position: relative;
  background: var(--cream);
  border-bottom: 1px solid var(--rule);
  padding: 52px 40px 48px;
  overflow: hidden;
}
.hub-hero__inner {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 48px;
  max-width: 1120px;
  margin: 0 auto;
}
.hub-hero__left { max-width: 500px; }
.hub-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dim);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.hub-hero__eyebrow-dot {
  width: 6px;
  height: 6px;
  background: var(--green);
  border-radius: 50%;
  flex-shrink: 0;
}
.hub-hero__h1 {
  font-family: var(--font-serif);
  font-size: 44px;
  font-weight: 800;
  line-height: 1.08;
  color: var(--black);
  letter-spacing: -0.8px;
  margin-bottom: 12px;
}
.hub-hero__h1 em {
  font-style: italic;
  color: var(--gold);
}
.hub-hero__sub {
  font-size: 14px;
  color: var(--dim);
  line-height: 1.65;
  margin-bottom: 28px;
}
.hub-hero__actions { display: flex; align-items: center; gap: 12px; }
.hub-hero__cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  box-shadow: 0 2px 12px rgba(0,0,0,.18);
  transition: opacity 0.1s;
}
.hub-hero__cta-primary:hover { opacity: 0.88; }
.hub-hero__cta-secondary {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dim);
}

/* Metric cards 2×2 grid */
.hub-hero__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}
.metric-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.metric-card--gold { background: var(--gold); border-color: var(--gold); }
.metric-card--dark { background: var(--black); border-color: var(--black); }
.metric-card__val {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  color: var(--black);
  margin-bottom: 5px;
}
.metric-card__val--faint { color: var(--faint); }
.metric-card__val--gold  { color: var(--gold); }
.metric-card__lbl {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
}
.metric-card--gold .metric-card__lbl { color: rgba(0,0,0,.5); }
.metric-card--dark .metric-card__lbl { color: #555; }
.metric-card__plan-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--gold);
  margin-bottom: 3px;
}
.metric-card__plan-name {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
  color: var(--white);
  letter-spacing: -0.3px;
}

/* ─── PRODUCTS SECTION ─── */
.products-wrap {
  background: var(--white);
  padding: 36px 40px;
  flex: 1;
}
.products-wrap__inner { max-width: 1120px; margin: 0 auto; }

.product-section { margin-bottom: 36px; }
.product-section:last-child { margin-bottom: 0; }

.section-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--rule);
}
.section-hd__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.section-hd__dot--green { background: var(--green); }
.section-hd__dot--gray  { background: var(--faint); }
.section-hd__dot--amber { background: #f59e0b; }
.section-hd__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--muted);
}
.section-hd__count {
  margin-left: auto;
  font-size: 11px;
  color: var(--faint);
  font-weight: 500;
  background: var(--surface);
  padding: 2px 8px;
  border-radius: 10px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.product-grid--2 { grid-template-columns: repeat(2, 1fr); }

/* ─── PRODUCT CARD ─── */
.pcard {
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  padding: 22px;
  background: var(--white);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
}
.pcard:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,.07);
  border-color: var(--faint);
  transform: translateY(-1px);
}
.pcard--locked { background: var(--surface); }
.pcard--locked:hover { box-shadow: none; border-color: var(--rule); transform: none; }

.pcard__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.pcard__icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  flex-shrink: 0;
}
.pcard--locked .pcard__icon { color: var(--faint); }

.pcard__badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 4px;
}
.pcard__badge--active { background: var(--green-s); color: #15803d; }
.pcard__badge--pro    { background: var(--blue-s);  color: var(--blue-t); }
.pcard__badge--trial  { background: var(--amber-s); color: var(--amber-t); }
.pcard__badge--locked { background: var(--surface); color: var(--muted); border: 1px solid var(--rule); }

.pcard__cat {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 4px;
}
.pcard__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.2;
}
.pcard--locked .pcard__name { color: var(--dim); }
.pcard__desc {
  font-size: 12px;
  color: var(--dim);
  line-height: 1.6;
  flex: 1;
  margin-bottom: 18px;
}
.pcard--locked .pcard__desc { color: var(--muted); }

.pcard__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pcard__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 600;
  transition: opacity 0.1s;
}
.pcard__btn--gold   { background: var(--gold);  color: var(--black); }
.pcard__btn--black  { background: var(--black); color: var(--white); }
.pcard__btn--ghost  { background: transparent; border: 1px solid var(--rule); color: var(--dim); }
.pcard__btn:hover   { opacity: 0.85; }
.pcard__btn:disabled { opacity: 0.45; cursor: not-allowed; }

.pcard__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
}
.pcard__meta--ok { color: var(--green); font-weight: 600; }

/* ─── STATE CARDS (loading / error / empty) ─── */
.state-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  font-size: 13px;
  color: var(--dim);
  margin: 0 0 24px;
}
.state-card--error { border-color: var(--red-s); background: var(--red-s); color: var(--red); }
.state-card__spin { animation: spin 1.2s linear infinite; }

/* ─── HUB FOOTER ─── */
.hub-footer {
  background: var(--surface);
  border-top: 1px solid var(--rule);
  padding: 16px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hub-footer__brand {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--faint);
}
.hub-footer__links { display: flex; gap: 20px; }
.hub-footer__link {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

/* ─── LOGIN PAGE (split layout) ─── */
.login-page {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Left brand panel */
.login-brand {
  background: var(--black);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 52px;
}
.login-brand__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
}
.login-brand__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
}
.login-brand__logomark {
  width: 40px;
  height: 40px;
  background: var(--gold);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-brand__logotype {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--white);
  letter-spacing: -0.3px;
}
.login-brand__headline {
  font-family: var(--font-serif);
  font-size: 38px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--white);
  letter-spacing: -0.8px;
  margin-bottom: 16px;
}
.login-brand__headline em {
  font-style: italic;
  color: var(--gold);
}
.login-brand__sub {
  font-size: 14px;
  color: #555;
  line-height: 1.65;
  max-width: 300px;
}

/* Right login panel */
.login-form-panel {
  background: var(--cream);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px;
  position: relative;
}
.login-form-inner { width: 100%; max-width: 320px; }

.login-tabs {
  display: flex;
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 9px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 28px;
}
.login-tab {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.login-tab--active {
  background: var(--black);
  color: var(--white);
  font-weight: 600;
}
.login-title {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  margin-bottom: 24px;
  letter-spacing: -0.4px;
  line-height: 1.2;
}

/* Clerk component wrapper — override Clerk's card styles */
.clerk-wrapper .cl-card {
  box-shadow: none !important;
  border: 1px solid var(--rule) !important;
  border-radius: var(--radius-lg) !important;
  padding: 24px !important;
}
.clerk-wrapper .cl-formButtonPrimary {
  background: var(--black) !important;
  color: var(--white) !important;
}

.login-terms {
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
}
.login-terms a { color: var(--dim); font-weight: 500; }
.login-footer-links {
  position: absolute;
  bottom: 20px;
  display: flex;
  gap: 16px;
}
.login-footer-links a { font-size: 11px; color: var(--muted); font-weight: 500; }

/* ─── ADMIN PANEL ─── */

/* Hero strip */
.admin-hero {
  background: var(--black);
  border-bottom: 1px solid #1a1a1a;
  padding: 28px 40px;
  position: relative;
  overflow: hidden;
}
.admin-hero__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1120px;
  margin: 0 auto;
}
.admin-hero__label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #444;
  margin-bottom: 6px;
}
.admin-hero__title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 800;
  color: var(--white);
  letter-spacing: -0.4px;
}
.admin-hero__title em { font-style: italic; color: var(--gold); }
.admin-hero__stats { display: flex; gap: 8px; }
.admin-stat {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: var(--radius-md);
  padding: 14px 20px;
  text-align: center;
  min-width: 80px;
}
.admin-stat__val {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 800;
  color: var(--gold);
  line-height: 1;
  margin-bottom: 4px;
}
.admin-stat__lbl {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #555;
}

/* 3-column grid */
.admin-body {
  display: grid;
  grid-template-columns: 260px 1fr 240px;
  flex: 1;
  min-height: 0;
}

/* Col 1: customer list */
.admin-customers {
  background: var(--white);
  border-right: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.admin-customers__header {
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
}
.admin-col-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 10px;
}
.admin-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}
.admin-search input {
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--ink);
  font-family: var(--font-sans);
  outline: none;
  width: 100%;
}
.admin-search input::placeholder { color: var(--muted); }
.admin-customer-list { flex: 1; overflow-y: auto; }
.admin-customer-item {
  padding: 11px 18px;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.1s;
  border-left: 3px solid transparent;
}
.admin-customer-item:hover { background: var(--surface); }
.admin-customer-item--active {
  background: #fffdf0;
  border-left-color: var(--gold);
}
.admin-customer-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--dim);
  flex-shrink: 0;
}
.admin-customer-item--active .admin-customer-avatar {
  background: var(--gold);
  color: var(--black);
  border-color: var(--gold);
}
.admin-customer-info { flex: 1; min-width: 0; }
.admin-customer-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.admin-customer-email {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Col 2: customer detail */
.admin-detail {
  padding: 24px 28px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--white);
}
.admin-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rule);
}
.admin-detail-avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.admin-detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--gold);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 800;
  color: var(--black);
  flex-shrink: 0;
}
.admin-detail-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.3px;
  margin-bottom: 3px;
}
.admin-detail-email { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.admin-detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.admin-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.admin-tag--active { background: var(--green-s); color: var(--green); }
.admin-tag--plan   { background: var(--blue-s);  color: var(--blue-t); }
.admin-tag--blocked { background: var(--red-s);  color: var(--red); }

.admin-sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.admin-sec-title::after { content: ''; flex: 1; height: 1px; background: var(--rule); }

/* Entitlements table */
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  padding: 0 0 8px;
  text-align: left;
  border-bottom: 1px solid var(--rule);
}
.admin-table td {
  padding: 10px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 12px;
  color: var(--ink);
  vertical-align: middle;
}
.admin-table tr:last-child td { border-bottom: none; }
.admin-ent-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-ent-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--surface);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  flex-shrink: 0;
}
.admin-ent-name { font-weight: 600; font-size: 12px; color: var(--ink); }

/* Status pill (used in table) */
.status-pill {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 7px;
  border-radius: 4px;
}
.status-pill--active,
.status-pill--internal { background: var(--green-s); color: #15803d; }
.status-pill--trial    { background: var(--amber-s); color: var(--amber-t); }
.status-pill--blocked,
.status-pill--cancelled,
.status-pill--expired  { background: var(--red-s); color: var(--red); }

/* Audit log */
.admin-log { display: flex; flex-direction: column; }
.admin-log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--rule);
}
.admin-log-item:last-child { border-bottom: none; }
.admin-log-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--faint);
  flex-shrink: 0;
  margin-top: 4px;
}
.admin-log-dot--green { background: var(--green); }
.admin-log-dot--red   { background: var(--red); }
.admin-log-dot--gold  { background: var(--gold); }
.admin-log-text {
  font-size: 12px;
  color: var(--dim);
  flex: 1;
  line-height: 1.4;
}
.admin-log-time { font-size: 10px; color: var(--muted); flex-shrink: 0; margin-top: 2px; }

/* Col 3: actions */
.admin-actions {
  background: var(--white);
  border-left: 1px solid var(--rule);
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
.admin-actions__title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--rule);
}
.admin-action-group { display: flex; flex-direction: column; gap: 6px; }
.admin-action-group-lbl {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--faint);
  margin-bottom: 2px;
}
.admin-action-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.1s;
  font-family: var(--font-sans);
}
.admin-action-btn:hover { opacity: 0.82; }
.admin-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.admin-action-btn--gold   { background: var(--gold);  color: var(--black); }
.admin-action-btn--black  { background: var(--black); color: var(--white); }
.admin-action-btn--ghost  { background: transparent; border: 1px solid var(--rule); color: var(--dim); }
.admin-action-btn--danger { background: var(--red-s); color: var(--red); }

.admin-notice {
  padding: 10px 12px;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--rule);
  background: var(--surface);
  color: var(--dim);
}
.admin-notice--success { background: var(--green-s); border-color: #bbf7d0; color: var(--green); }
.admin-notice--error   { background: var(--red-s);   border-color: #fecaca; color: var(--red); }

/* Admin form fields */
.admin-field { display: flex; flex-direction: column; gap: 4px; }
.admin-field label { font-size: 11px; font-weight: 600; color: var(--dim); }
.admin-field select,
.admin-field input[type="text"],
.admin-field input[type="number"] {
  padding: 7px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: var(--font-sans);
  color: var(--ink);
  background: var(--white);
  outline: none;
}
.admin-field select:focus,
.admin-field input:focus { border-color: var(--gold); }

.admin-info-note {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--rule);
}

/* ─── WORKSPACE BLOCK (admin detail) ─── */
.workspace-block {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 14px;
}
.workspace-block__name { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
.workspace-block__meta { font-size: 11px; color: var(--muted); }

/* ─── RESPONSIVE ─── */
@media (max-width: 900px) {
  .topbar { padding: 0 20px; }
  .hub-hero { padding: 36px 20px 32px; }
  .hub-hero__inner { flex-direction: column; gap: 28px; }
  .hub-hero__metrics { grid-template-columns: repeat(4, 1fr); width: 100%; }
  .products-wrap { padding: 28px 20px; }
  .product-grid { grid-template-columns: repeat(2, 1fr); }
  .product-grid--2 { grid-template-columns: 1fr; }
  .admin-body { grid-template-columns: 1fr; }
  .admin-customers { max-height: 240px; }
  .admin-actions { border-left: none; border-top: 1px solid var(--rule); }
  .login-page { grid-template-columns: 1fr; }
  .login-brand { display: none; }
}

@media (max-width: 640px) {
  .hub-hero__h1 { font-size: 32px; }
  .hub-hero__metrics { grid-template-columns: repeat(2, 1fr); }
  .product-grid, .product-grid--2 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verificar no browser**

Abra `http://localhost:5173`. A página deve carregar com as fontes novas e sem erros no console. Os estilos antigos podem parecer quebrados — normal, pois os nomes de classe do markup ainda não foram atualizados.

- [ ] **Step 3: Commit**

```bash
git add apps/hub-web/src/styles.css
git commit -m "feat(hub-web): replace design system with Prymeira brand tokens"
```

---

## Task 3: Componente Landing (tela de login)

**Files:**
- Modify: `apps/hub-web/src/App.tsx` (função `Landing` + imports)

- [ ] **Step 1: Adicionar imports do Clerk necessários**

No topo de `App.tsx`, substitua o bloco de imports do Clerk por:

```tsx
import {
  ClerkLoading,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser
} from "@clerk/clerk-react";
```

E adicione o import do ícone de estado de carregamento (já existe `RefreshCw`):

```tsx
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Grid2X2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
```

- [ ] **Step 2: Adicionar state de tab à Landing e o SVG do logomark**

Adicione este helper SVG antes das funções de componente (após os imports):

```tsx
function Logomark({ size = 32, radius = 7 }: { size?: number; radius?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: "var(--gold)", borderRadius: radius,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 22 22" fill="none">
        <path d="M4 3h8C13.657 3 15 4.343 15 6v2c0 1.657-1.343 3-3 3H4V3z" fill="#0c0c0c" />
        <rect x="4" y="11" width="3" height="8" fill="#0c0c0c" />
        <circle cx="13" cy="6.5" r="1.8" fill="#FCC009" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Reescrever o componente Landing**

Substitua a função `Landing` existente (linhas 256–270 em App.tsx) por:

```tsx
function Landing() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const clerkAppearance = {
    variables: {
      colorPrimary: "#0c0c0c",
      colorBackground: "#ffffff",
      colorInputBackground: "#ffffff",
      colorInputText: "#171717",
      borderRadius: "7px",
      fontFamily: "Inter, sans-serif",
    },
    elements: {
      card: { boxShadow: "none", border: "none", padding: 0 },
      formButtonPrimary: { backgroundColor: "#0c0c0c", color: "#ffffff" },
      socialButtonsBlockButton: { border: "1px solid #e5e5e5" },
    },
  };

  return (
    <div className="login-page">
      {/* Left brand panel */}
      <div className="login-brand">
        <svg
          className="topo-pattern"
          viewBox="0 0 560 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="#FCC009" strokeWidth="1" opacity=".13">
            <ellipse cx="280" cy="300" rx="500" ry="380" />
            <ellipse cx="280" cy="300" rx="420" ry="318" />
            <ellipse cx="280" cy="300" rx="340" ry="258" />
            <ellipse cx="280" cy="300" rx="260" ry="198" />
            <ellipse cx="280" cy="300" rx="180" ry="138" />
            <ellipse cx="280" cy="300" rx="100" ry="78" />
            <ellipse cx="280" cy="300" rx="40" ry="32" />
            <ellipse cx="520" cy="60" rx="280" ry="160" />
            <ellipse cx="520" cy="60" rx="210" ry="118" />
            <ellipse cx="520" cy="60" rx="140" ry="78" />
            <ellipse cx="520" cy="60" rx="70" ry="40" />
            <ellipse cx="40" cy="540" rx="260" ry="150" />
            <ellipse cx="40" cy="540" rx="190" ry="108" />
            <ellipse cx="40" cy="540" rx="120" ry="68" />
            <ellipse cx="40" cy="540" rx="50" ry="30" />
          </g>
        </svg>
        <div className="login-brand__inner">
          <div className="login-brand__logo">
            <Logomark size={40} radius={9} />
            <span className="login-brand__logotype">Prymeira</span>
          </div>
          <h1 className="login-brand__headline">
            Todos os seus<br />apps em um<br /><em>único lugar.</em>
          </h1>
          <p className="login-brand__sub">
            Gerencie acessos, planos e integrações de todos os seus produtos com um só login.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "signin"}
              className={`login-tab${tab === "signin" ? " login-tab--active" : ""}`}
              onClick={() => setTab("signin")}
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={tab === "signup"}
              className={`login-tab${tab === "signup" ? " login-tab--active" : ""}`}
              onClick={() => setTab("signup")}
            >
              Criar conta
            </button>
          </div>

          <h2 className="login-title">
            {tab === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>

          <div className="clerk-wrapper">
            {tab === "signin" ? (
              <SignIn routing="virtual" appearance={clerkAppearance} />
            ) : (
              <SignUp routing="virtual" appearance={clerkAppearance} />
            )}
          </div>

          <p className="login-terms">
            Ao continuar, você concorda com os{" "}
            <a href="/termos">Termos de uso</a> e{" "}
            <a href="/privacidade">Política de privacidade</a>
          </p>
        </div>
        <div className="login-footer-links">
          <a href="/termos">Termos</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/suporte">Suporte</a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Atualizar o ClerkLoading state**

Substitua o bloco `<ClerkLoading>` existente no componente `App` por:

```tsx
<ClerkLoading>
  <div className="page-loading">
    <div className="page-loading__inner">
      <Logomark size={40} radius={9} />
      <RefreshCw size={18} className="page-loading__spin" />
    </div>
  </div>
</ClerkLoading>
```

- [ ] **Step 5: Verificar no browser**

Acesse `http://localhost:5173` sem estar logado. O split layout deve aparecer com o painel preto à esquerda (pattern topográfico + logo + headline) e o formulário Clerk à direita. Teste as tabs "Entrar" / "Criar conta".

- [ ] **Step 6: Commit**

```bash
git add apps/hub-web/src/App.tsx
git commit -m "feat(hub-web): redesign landing page with split layout + Clerk SignIn/SignUp"
```

---

## Task 4: Componente Hub — topbar + hero + métricas

**Files:**
- Modify: `apps/hub-web/src/App.tsx` (função `Hub`)

- [ ] **Step 1: Reescrever o Hub**

Substitua a função `Hub` existente (linhas 105–254 em App.tsx) pelo código abaixo. Toda a lógica de fetch de dados e estado é preservada; apenas o JSX é alterado:

```tsx
function Hub() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [data, setData] = useState<AccountProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getToken()
      .then((token) => {
        if (!token) throw new Error("Sessão Clerk sem token.");
        return fetchMyProducts(token);
      })
      .then((response) => { if (!active) return; setData(response); })
      .catch((err: unknown) => { if (!active) return; setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!active) return; setIsLoading(false); });
    return () => { active = false; };
  }, [getToken]);

  useEffect(() => {
    let active = true;
    getToken()
      .then((token) => {
        if (!token) throw new Error("Sessão Clerk sem token.");
        return fetchAdminSession(token);
      })
      .then(() => { if (!active) return; setIsAdmin(true); })
      .catch(() => { if (!active) return; setIsAdmin(false); });
    return () => { active = false; };
  }, [getToken]);

  const groups = useMemo(() => productGroups(data?.products ?? []), [data]);
  const activeCount = data?.products.filter((p) => p.allowed).length ?? 0;
  const trialCount = data?.products.filter((p) => !p.allowed && p.status === "trial").length ?? 0;
  const lockedCount = data?.products.filter((p) => !p.allowed && p.status !== "trial").length ?? 0;
  const plan = (data?.workspace as any)?.plan ?? data?.workspace?.type ?? null;
  const displayName = user?.firstName ?? user?.fullName ?? data?.customer?.email ?? "Conta";
  const workspaceName = data?.workspace?.name ?? "Workspace";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar__logo">
          <Logomark size={32} radius={7} />
          <span className="topbar__logotype">Prymeira</span>
        </div>
        <div className="topbar__sep" />
        <div className="topbar__workspace">
          <span className="topbar__ws-dot" />
          {workspaceName}
        </div>
        <nav className="topbar__nav" aria-label="Principal">
          <span className="topbar__nav-item topbar__nav-item--active">Hub</span>
          <a className="topbar__nav-item" href="/planos">Planos</a>
          <a className="topbar__nav-item" href="/suporte">Suporte</a>
        </nav>
        <div className="topbar__right">
          {isAdmin && (
            <a href="/admin" className="topbar__admin-badge" aria-label="Painel admin">
              <ShieldCheck size={11} aria-hidden="true" />
              Admin
            </a>
          )}
          <button className="topbar__icon-btn" aria-label="Notificações">
            <Bell size={15} aria-hidden="true" />
          </button>
          <div className="topbar__user">
            <div className="topbar__avatar" aria-hidden="true">{initials}</div>
            <span>{displayName}</span>
            <ChevronDown size={11} aria-hidden="true" />
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* HERO */}
      <section className="hub-hero" aria-label="Resumo da conta">
        <svg
          className="topo-pattern"
          viewBox="0 0 1120 220"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="#FCC009" strokeWidth=".9" opacity=".18">
            <ellipse cx="980" cy="110" rx="400" ry="170" />
            <ellipse cx="980" cy="110" rx="340" ry="138" />
            <ellipse cx="980" cy="110" rx="280" ry="108" />
            <ellipse cx="980" cy="110" rx="220" ry="80" />
            <ellipse cx="980" cy="110" rx="160" ry="55" />
            <ellipse cx="980" cy="110" rx="100" ry="34" />
            <ellipse cx="980" cy="110" rx="46" ry="16" />
            <ellipse cx="140" cy="200" rx="320" ry="140" />
            <ellipse cx="140" cy="200" rx="260" ry="108" />
            <ellipse cx="140" cy="200" rx="200" ry="80" />
            <ellipse cx="140" cy="200" rx="140" ry="55" />
            <ellipse cx="140" cy="200" rx="80" ry="32" />
            <ellipse cx="560" cy="-30" rx="260" ry="130" />
            <ellipse cx="560" cy="-30" rx="200" ry="98" />
            <ellipse cx="560" cy="-30" rx="140" ry="68" />
          </g>
        </svg>
        <div className="hub-hero__inner">
          <div className="hub-hero__left">
            <div className="hub-hero__eyebrow">
              <span className="hub-hero__eyebrow-dot" />
              Workspace · {workspaceName}
            </div>
            <h1 className="hub-hero__h1">
              Olá, <em>{displayName}.</em>
            </h1>
            <p className="hub-hero__sub">
              Acesse, gerencie e expanda seus produtos Prymeira. Tudo centralizado, tudo no seu controle.
            </p>
            <div className="hub-hero__actions">
              <a href="#produtos" className="hub-hero__cta-primary">
                <Grid2X2 size={13} aria-hidden="true" />
                Ver todos os apps
              </a>
              <a href="/planos" className="hub-hero__cta-secondary">
                Gerenciar plano
                <ArrowRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="hub-hero__metrics" aria-label="Métricas de acesso">
            <div className="metric-card metric-card--gold">
              <div className="metric-card__val">{activeCount}</div>
              <div className="metric-card__lbl">Ativos</div>
            </div>
            <div className="metric-card">
              <div className={`metric-card__val${trialCount === 0 ? " metric-card__val--faint" : ""}`}>
                {trialCount}
              </div>
              <div className="metric-card__lbl">Trials</div>
            </div>
            <div className="metric-card">
              <div className={`metric-card__val${lockedCount === 0 ? " metric-card__val--faint" : ""}`}>
                {lockedCount}
              </div>
              <div className="metric-card__lbl">Bloqueados</div>
            </div>
            <div className="metric-card metric-card--dark">
              <div className="metric-card__plan-label">Plano</div>
              <div className="metric-card__plan-name">{plan ?? "—"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <main className="products-wrap" id="produtos">
        <div className="products-wrap__inner">
          {isLoading && (
            <div className="state-card">
              <RefreshCw size={16} className="state-card__spin" aria-hidden="true" />
              <span>Carregando seus produtos...</span>
            </div>
          )}
          {error && (
            <div className="state-card state-card--error" role="alert">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {!isLoading && !error && groups.length === 0 && (
            <div className="state-card">
              <Sparkles size={16} aria-hidden="true" />
              <span>Nenhum produto cadastrado para exibir.</span>
            </div>
          )}
          {groups.map((group) => (
            <section className="product-section" key={group.title}>
              <div className="section-hd">
                <span className={`section-hd__dot section-hd__dot--${
                  group.title.includes("ativo") ? "green"
                  : group.title.includes("testar") ? "amber"
                  : "gray"
                }`} />
                <span className="section-hd__title">{group.title}</span>
                <span className="section-hd__count">{group.products.length}</span>
              </div>
              <div className={`product-grid${group.products.length <= 2 ? " product-grid--2" : ""}`}>
                {group.products.map((product) => (
                  <ProductCard key={product.product_key} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="hub-footer">
        <span className="hub-footer__brand">Prymeira</span>
        <div className="hub-footer__links">
          <a className="hub-footer__link" href="/termos">Termos de uso</a>
          <a className="hub-footer__link" href="/privacidade">Privacidade</a>
          <a className="hub-footer__link" href="/suporte">Suporte</a>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verificar no browser**

Faça login e acesse `http://localhost:5173`. A topbar deve mostrar o logo Prymeira, workspace pill e nav. O hero deve mostrar o nome do usuário em itálico gold com o padrão topográfico. Os 4 metric cards devem aparecer no canto direito.

- [ ] **Step 3: Commit**

```bash
git add apps/hub-web/src/App.tsx
git commit -m "feat(hub-web): redesign Hub component — topbar, hero, metrics"
```

---

## Task 5: Componente ProductCard

**Files:**
- Modify: `apps/hub-web/src/App.tsx` (função `ProductCard`)

- [ ] **Step 1: Reescrever ProductCard**

Substitua a função `ProductCard` existente (linhas 67–103 em App.tsx) por:

```tsx
function badgeClass(product: AccountProductAccess): string {
  if (!product.allowed && product.status === "trial") return "pcard__badge--trial";
  if (!product.allowed) return "pcard__badge--locked";
  if (product.plan && product.plan !== "internal") return "pcard__badge--pro";
  return "pcard__badge--active";
}

function ProductCard({ product }: { product: AccountProductAccess }) {
  const presentation = readProductPresentation(product.product_key);
  const Icon = presentation.icon;
  const targetUrl = product.allowed
    ? resolveProductUrl(product.product_key, product.app_url)
    : product.upgrade_url ?? product.marketing_url ?? null;
  const disabled = !targetUrl || targetUrl === "#";
  const isLocked = !product.allowed;

  return (
    <article className={`pcard${isLocked ? " pcard--locked" : ""}`}>
      <div className="pcard__top">
        <div className="pcard__icon">
          <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
        </div>
        <span className={`pcard__badge ${badgeClass(product)}`}>
          {statusLabel(product)}
        </span>
      </div>
      <div className="pcard__cat">{presentation.category}</div>
      <div className="pcard__name">{product.name}</div>
      <p className="pcard__desc">
        {product.description ?? "Produto Prymeira conectado à sua conta central."}
      </p>
      <div className="pcard__footer">
        {disabled ? (
          <button className="pcard__btn pcard__btn--ghost" type="button" disabled>
            {actionLabel(product)}
          </button>
        ) : (
          <a
            className={`pcard__btn ${product.allowed ? "pcard__btn--gold" : "pcard__btn--ghost"}`}
            href={targetUrl}
          >
            {actionLabel(product)}
            {product.allowed
              ? <ArrowRight size={12} aria-hidden="true" />
              : <Lock size={11} aria-hidden="true" />}
          </a>
        )}
        {product.workspace_role && (
          <span className="pcard__meta">
            {product.workspace_role}
          </span>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Remover funções não mais usadas**

Remova a importação de `Building2`, `CheckCircle2` e `SignInButton` dos imports (se existirem e não forem mais usados). Confirme que `Sparkles`, `ShieldCheck`, `RefreshCw`, `ArrowRight`, `Lock`, `Bell`, `ChevronDown`, `Grid2X2` estão importados do `lucide-react`.

- [ ] **Step 3: Verificar no browser**

Os product cards devem aparecer com ícone Lucide (sem emoji), badge de status colorido, botão gold para produtos ativos e ghost para bloqueados.

- [ ] **Step 4: Commit**

```bash
git add apps/hub-web/src/App.tsx
git commit -m "feat(hub-web): redesign ProductCard — Lucide icons, status badges, gold CTA"
```

---

## Task 6: AdminPanel redesign

**Files:**
- Modify: `apps/hub-web/src/AdminPanel.tsx`

- [ ] **Step 1: Atualizar imports do AdminPanel**

No topo de `AdminPanel.tsx`, substitua o bloco de imports de ícones por:

```tsx
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  Clock3,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle
} from "lucide-react";
```

E remova o import do `logo` (não vamos mais usar a imagem SVG; usaremos o `Logomark` inline). Adicione uma importação local do helper:

```tsx
// Inline logomark — mesmo SVG do App.tsx
function Logomark({ size = 32, radius = 7 }: { size?: number; radius?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: "#FCC009", borderRadius: radius,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 22 22" fill="none">
        <path d="M4 3h8C13.657 3 15 4.343 15 6v2c0 1.657-1.343 3-3 3H4V3z" fill="#0c0c0c" />
        <rect x="4" y="11" width="3" height="8" fill="#0c0c0c" />
        <circle cx="13" cy="6.5" r="1.8" fill="#FCC009" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Reescrever o JSX do return do AdminPanel**

Localize o `return (` do componente `AdminPanel` (por volta da linha 300 do arquivo original). Substitua **todo o JSX do return** mantendo toda a lógica de estado e handlers intactos. O novo JSX:

```tsx
  // Estado de carregamento de admin check
  if (isCheckingAdmin) {
    return (
      <div className="page-loading">
        <div className="page-loading__inner">
          <Logomark size={40} radius={9} />
          <RefreshCw size={18} className="page-loading__spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-loading">
        <div className="page-loading__inner">
          <ShieldCheck size={24} style={{ color: "var(--muted)" }} />
          <p style={{ fontSize: 14, color: "var(--dim)" }}>Acesso negado.</p>
          <a href="/" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>← Voltar ao Hub</a>
        </div>
      </div>
    );
  }

  const customerInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const adminInitials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar__logo">
          <Logomark size={32} radius={7} />
          <span className="topbar__logotype">Prymeira</span>
        </div>
        <div className="topbar__sep" />
        <div className="topbar__admin-badge">
          <ShieldCheck size={11} aria-hidden="true" />
          Admin
        </div>
        <div className="topbar__right">
          <a href="/" className="topbar__back-btn">
            <ArrowLeft size={13} aria-hidden="true" />
            Voltar ao Hub
          </a>
          <div className="topbar__user">
            <div className="topbar__avatar">{adminInitials}</div>
            <span>{displayName}</span>
            <ChevronDown size={11} aria-hidden="true" />
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* ADMIN HERO STRIP */}
      <div className="admin-hero">
        <svg
          className="topo-pattern"
          viewBox="0 0 1120 100"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="#FCC009" strokeWidth=".8" opacity=".1">
            <ellipse cx="1000" cy="50" rx="380" ry="140" />
            <ellipse cx="1000" cy="50" rx="300" ry="108" />
            <ellipse cx="1000" cy="50" rx="220" ry="78" />
            <ellipse cx="1000" cy="50" rx="140" ry="50" />
            <ellipse cx="1000" cy="50" rx="60" ry="24" />
            <ellipse cx="120" cy="50" rx="260" ry="100" />
            <ellipse cx="120" cy="50" rx="190" ry="72" />
            <ellipse cx="120" cy="50" rx="120" ry="46" />
            <ellipse cx="120" cy="50" rx="50" ry="20" />
          </g>
        </svg>
        <div className="admin-hero__inner">
          <div>
            <div className="admin-hero__label">Painel de administração</div>
            <h1 className="admin-hero__title">Gestão de <em>clientes</em></h1>
          </div>
          <div className="admin-hero__stats">
            <div className="admin-stat">
              <div className="admin-stat__val">{customers.length}</div>
              <div className="admin-stat__lbl">Clientes</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__val">
                {customers.reduce((acc, c) => acc + (c.entitlementCount ?? 0), 0)}
              </div>
              <div className="admin-stat__lbl">Permissões</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__val">{isLoading ? "…" : "—"}</div>
              <div className="admin-stat__lbl">Logs hoje</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-COLUMN BODY */}
      <div className="admin-body" style={{ flex: 1 }}>

        {/* Col 1 — Customer list */}
        <div className="admin-customers">
          <div className="admin-customers__header">
            <div className="admin-col-title">Clientes</div>
            <form onSubmit={submitSearch}>
              <div className="admin-search">
                <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  aria-label="Buscar cliente"
                />
              </div>
            </form>
          </div>
          <div className="admin-customer-list" role="listbox" aria-label="Lista de clientes">
            {customers.map((c) => (
              <div
                key={c.id}
                role="option"
                aria-selected={c.id === selectedCustomerId}
                className={`admin-customer-item${c.id === selectedCustomerId ? " admin-customer-item--active" : ""}`}
                onClick={() => setSelectedCustomerId(c.id)}
              >
                <div className="admin-customer-avatar">
                  {customerInitials(c.name ?? c.email ?? "?")}
                </div>
                <div className="admin-customer-info">
                  <div className="admin-customer-name">{c.name ?? "—"}</div>
                  <div className="admin-customer-email">{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2 — Customer detail */}
        <div className="admin-detail">
          {!customer && !isLoading && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Selecione um cliente.</p>
          )}
          {isLoading && (
            <div className="state-card">
              <RefreshCw size={15} className="state-card__spin" aria-hidden="true" />
              <span>Carregando...</span>
            </div>
          )}
          {customer && (
            <>
              {/* Header */}
              <div className="admin-detail-header">
                <div className="admin-detail-avatar-row">
                  <div className="admin-detail-avatar">
                    {customerInitials(customer.name ?? customer.email ?? "?")}
                  </div>
                  <div>
                    <div className="admin-detail-name">{customer.name ?? "—"}</div>
                    <div className="admin-detail-email">{customer.email}</div>
                    <div className="admin-detail-tags">
                      <span className="admin-tag admin-tag--active">Ativo</span>
                      {workspace?.type && (
                        <span className="admin-tag admin-tag--plan">{workspace.type}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace selector */}
              {customer.workspaces.length > 1 && (
                <div>
                  <div className="admin-sec-title">Workspace</div>
                  <div className="admin-field">
                    <select
                      value={selectedWorkspaceId}
                      onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    >
                      {customer.workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Entitlements */}
              {workspace && workspace.entitlements.length > 0 && (
                <div>
                  <div className="admin-sec-title">Produtos & entitlements</div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Status</th>
                        <th>Plano</th>
                        <th>Expira</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.entitlements.map((ent) => (
                        <tr key={ent.id}>
                          <td>
                            <div className="admin-ent-cell">
                              <div className="admin-ent-icon">
                                <KeyRound size={13} aria-hidden="true" />
                              </div>
                              <span className="admin-ent-name">{ent.productKey}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-pill--${ent.status}`}>
                              {ent.status}
                            </span>
                          </td>
                          <td style={{ color: "var(--dim)", fontSize: 12 }}>{ent.plan ?? "—"}</td>
                          <td style={{ color: "var(--muted)", fontSize: 11 }}>
                            {formatDate(ent.trialEndsAt ?? ent.endsAt ?? ent.currentPeriodEndsAt)}
                          </td>
                          <td>
                            <button
                              className="topbar__icon-btn"
                              type="button"
                              onClick={() => void handleBlock(ent)}
                              aria-label={`Bloquear ${ent.productKey}`}
                              style={{ width: 28, height: 28 }}
                            >
                              <Ban size={13} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Audit log */}
              {auditLogs.length > 0 && (
                <div>
                  <div className="admin-sec-title">Histórico recente</div>
                  <div className="admin-log">
                    {auditLogs.slice(0, 8).map((log, i) => (
                      <div key={i} className="admin-log-item">
                        <span className={`admin-log-dot admin-log-dot--${
                          log.action?.includes("block") || log.action?.includes("cancel") ? "red"
                          : log.action?.includes("trial") ? "gold"
                          : "green"
                        }`} />
                        <span className="admin-log-text">
                          <strong>{log.productKey}</strong> — {log.action}
                        </span>
                        <span className="admin-log-time">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Col 3 — Actions */}
        <div className="admin-actions">
          <div className="admin-actions__title">Ações</div>

          {notice && (
            <div className={`admin-notice admin-notice--${notice.tone}`} role="alert">
              {notice.message}
            </div>
          )}

          {/* Entitlement form */}
          <form onSubmit={submitEntitlement} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="admin-action-group-lbl">Permissão</div>
            <div className="admin-field">
              <label htmlFor="admin-product">Produto</label>
              <select id="admin-product" value={productKey} onChange={(e) => setProductKey(e.target.value)}>
                {productKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="admin-status">Status</label>
              <select id="admin-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="admin-plan">Plano</label>
              <input id="admin-plan" type="text" value={plan} onChange={(e) => setPlan(e.target.value)} />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-token">Token</label>
              <input id="admin-token" type="text" value={actionToken} onChange={(e) => setActionToken(e.target.value)} placeholder="token de ação" />
            </div>
            <button
              className="admin-action-btn admin-action-btn--gold"
              type="submit"
              disabled={isLoading || !workspace}
            >
              <KeyRound size={13} aria-hidden="true" />
              Salvar permissão
            </button>
          </form>

          {/* Trial form */}
          <form onSubmit={submitTrial} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="admin-action-group-lbl">Trial</div>
            <div className="admin-field">
              <label htmlFor="admin-trial-days">Dias</label>
              <input
                id="admin-trial-days"
                type="number"
                value={trialDays}
                min={1}
                max={365}
                onChange={(e) => setTrialDays(Number(e.target.value))}
              />
            </div>
            <button
              className="admin-action-btn admin-action-btn--black"
              type="submit"
              disabled={isLoading || !workspace}
            >
              <Clock3 size={13} aria-hidden="true" />
              Conceder trial
            </button>
          </form>

          <div className="admin-action-group">
            <div className="admin-action-group-lbl">Perigo</div>
            <button
              className="admin-action-btn admin-action-btn--danger"
              type="button"
              disabled={isLoading || !workspace}
              onClick={() => {
                if (confirm("Suspender conta?")) void signOut({ redirectUrl: "/" });
              }}
            >
              <XCircle size={13} aria-hidden="true" />
              Suspender conta
            </button>
          </div>

          <div className="admin-info-note">
            Todas as ações são registradas no histórico e podem ser revertidas pelo suporte.
          </div>
        </div>
      </div>
    </div>
  );
```

> **Nota:** O `handleBlock` precisa ser extraído dos handlers existentes. No AdminPanel original, o block é chamado via `onBlock` no `EntitlementRow`. Adapte para uma função local:
> ```tsx
> async function handleBlock(ent: AdminEntitlement) {
>   if (!confirm(`Bloquear ${ent.productKey}?`)) return;
>   setIsLoading(true);
>   setNotice(null);
>   try {
>     await withToken((token) => blockAdminEntitlement(token, actionToken, {
>       workspace_id: workspace?.id ?? "",
>       product_key: ent.productKey,
>     }));
>     setNotice({ tone: "success", message: "Produto bloqueado." });
>     if (selectedCustomerId) await loadCustomer(selectedCustomerId);
>   } catch (error) {
>     setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
>   } finally {
>     setIsLoading(false);
>   }
> }
> ```

- [ ] **Step 3: Verificar no browser**

Acesse `http://localhost:5173/admin`. O painel deve exibir: topbar com badge Admin + botão voltar, hero strip escuro com padrão topográfico, 3 colunas com lista de clientes à esquerda, detalhe ao centro e ações à direita.

- [ ] **Step 4: Commit**

```bash
git add apps/hub-web/src/AdminPanel.tsx
git commit -m "feat(hub-web): redesign AdminPanel — 3-column layout, brand topbar, audit log"
```

---

## Task 7: Verificação final e ajustes

**Files:**
- Review: todos os arquivos modificados

- [ ] **Step 1: Rodar o type-check**

```bash
cd apps/hub-web && pnpm tsc --noEmit
```

Corrija qualquer erro de tipos antes de prosseguir. Erros comuns:
- Propriedades inexistentes em `AdminCustomerListItem` (ex: `entitlementCount`) — use `(c as any).entitlementCount ?? 0` ou remova o cálculo do total
- Import de ícones não utilizados — remova

- [ ] **Step 2: Verificar responsividade**

No DevTools, teste com viewport de 375px (mobile) e 768px (tablet). Confirme:
- Mobile: topbar colapsa, hero empilha, produto grid em 1 coluna
- Tablet: produto grid em 2 colunas, admin colapsa para 1 coluna

- [ ] **Step 3: Verificar acessibilidade básica**

- Todos os botões têm texto ou `aria-label`
- Imagens têm `alt` ou `aria-hidden="true"`
- O formulário de login tem `role="tablist"` e `aria-selected` nas tabs

- [ ] **Step 4: Commit final**

```bash
git add -p
git commit -m "fix(hub-web): type fixes and accessibility polish post-redesign"
```

---

## Referência rápida de classes CSS

| Elemento | Classe principal |
|----------|-----------------|
| Shell (page wrapper) | `.shell` |
| Topbar | `.topbar`, `.topbar__logo`, `.topbar__sep`, `.topbar__workspace`, `.topbar__nav`, `.topbar__right` |
| Logomark div | `.topbar__logomark` / inline via `<Logomark />` |
| Hub hero section | `.hub-hero`, `.hub-hero__inner`, `.hub-hero__h1` |
| Metric cards | `.metric-card`, `.metric-card--gold`, `.metric-card--dark` |
| Section header | `.section-hd`, `.section-hd__dot--green/gray/amber` |
| Product grid | `.product-grid`, `.product-grid--2` |
| Product card | `.pcard`, `.pcard--locked`, `.pcard__btn--gold/black/ghost` |
| Status badge | `.pcard__badge--active/pro/trial/locked` |
| Login page | `.login-page`, `.login-brand`, `.login-form-panel`, `.login-tabs` |
| Admin 3 cols | `.admin-body`, `.admin-customers`, `.admin-detail`, `.admin-actions` |
| Admin action btn | `.admin-action-btn--gold/black/ghost/danger` |
| Notice / alert | `.admin-notice--success/error` |
| Status pill (table) | `.status-pill--active/trial/blocked` |
