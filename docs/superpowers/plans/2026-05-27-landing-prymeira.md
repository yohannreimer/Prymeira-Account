# Landing Page prymeiradigital.com.br — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the institutional landing page at `prymeiradigital.com.br`, presenting all Prymeira products, pricing comparison, and plan selection — served from the existing `hub-web` container via hostname-based routing.

**Architecture:** A new `LandingPage.tsx` component is added to `apps/hub-web/src/`. `App.tsx` checks `window.location.hostname` at render time: when the hostname is `prymeiradigital.com.br` (or `www.`), it returns `<LandingPage />` unconditionally before any Clerk auth rendering. A `/landing-preview` pathname flag enables local development without changing the hostname. A new Traefik router in `portainer-prymeira-account.yml` points both apex domain variants to the already-running `prymeira_hub_web` service — no new containers or pipelines.

**Tech Stack:** React 18, TypeScript, inline styles only (no CSS modules, no Tailwind), Vite build.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `apps/hub-web/src/LandingPage.tsx` | Complete landing page — all 8 sections, responsive |
| Modify | `apps/hub-web/src/App.tsx` | Add `isLandingHost` + `isLandingPreview` early-return routing |
| Modify | `deploy/portainer-prymeira-account.yml` | Add Traefik labels for root domain → existing service |

---

## Task 1: App.tsx routing + LandingPage stub

**Files:**
- Create: `apps/hub-web/src/LandingPage.tsx`
- Modify: `apps/hub-web/src/App.tsx` (lines 751–777, the `App` function)

- [ ] **Step 1: Create the stub `LandingPage.tsx`**

Create `apps/hub-web/src/LandingPage.tsx` with this content:

```tsx
export function LandingPage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <p style={{ padding: 48, color: "#0a0a09" }}>Landing Page — em construção</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
pnpm --filter @prymeira/hub-web build
```

Expected: build completes with no errors (something like `✓ built in Xs`). Fix any TypeScript errors before continuing.

- [ ] **Step 3: Update `App.tsx` — add import and routing**

Add to the imports at the top of `apps/hub-web/src/App.tsx` (after the existing imports):

```tsx
import { LandingPage } from "./LandingPage";
```

Replace the `App` function body (currently starts at line 751) with:

```tsx
export function App() {
  const isLandingHost =
    window.location.hostname === "prymeiradigital.com.br" ||
    window.location.hostname === "www.prymeiradigital.com.br";
  const isLandingPreview = window.location.pathname === "/landing-preview";

  if (isLandingHost || isLandingPreview) {
    return <LandingPage />;
  }

  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const isAccessDeniedRoute = window.location.pathname.startsWith("/acesso-negado");
  const isPlansRoute = window.location.pathname.startsWith("/planos");

  return (
    <>
      <ClerkLoading>
        <div className="page-loading">
          <div className="page-loading__inner">
            <Logomark size={48} />
            <RefreshCw size={18} className="page-loading__spin" />
          </div>
        </div>
      </ClerkLoading>
      <SignedOut>
        {isPlansRoute ? <PlansPage /> : <Landing />}
      </SignedOut>
      <SignedIn>
        {isAdminRoute ? <AdminPanel /> :
         isAccessDeniedRoute ? <AccessDeniedPage /> :
         isPlansRoute ? <PlansPage /> :
         <Hub />}
      </SignedIn>
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles again**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
pnpm --filter @prymeira/hub-web build
```

Expected: build completes with no errors.

- [ ] **Step 5: Visual check at `/landing-preview`**

Start the dev server if it is not already running:
```bash
pnpm --dir "/Users/yohannreimer/Downloads/Locais/Prymeira Account" --filter @prymeira/hub-web dev
```

Open `http://localhost:5175/landing-preview` in a browser.
Expected: page shows "Landing Page — em construção" in dark text on white. No Clerk login screen. No Hub UI.

- [ ] **Step 6: Commit**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
git add apps/hub-web/src/LandingPage.tsx apps/hub-web/src/App.tsx
git commit -m "feat: add isLandingHost/isLandingPreview routing and LandingPage stub"
```

---

## Task 2: Implement full `LandingPage.tsx`

**Files:**
- Modify: `apps/hub-web/src/LandingPage.tsx` (replace stub entirely)

- [ ] **Step 1: Replace `LandingPage.tsx` with the full implementation**

Replace the entire contents of `apps/hub-web/src/LandingPage.tsx` with:

```tsx
import { useState, useEffect } from "react";
import logomark from "./assets/prymeira-selo.png";
import logotype from "./assets/prymeira-logo.png";

// ─── Constants ───────────────────────────────────────────────────────────────

const HUB_URL = "https://hub.prymeiradigital.com.br";
const HUB_SIGNUP_URL = "https://hub.prymeiradigital.com.br/?tab=signup";
const HUB_PLANS_URL = "https://hub.prymeiradigital.com.br/planos";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

type Product = { name: string; color: string; url: string; desc: string };
type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  products: string[];
  recommended?: boolean;
};

const PRODUCTS: Product[] = [
  {
    name: "Talk",
    color: "#2a5f4a",
    url: `${HUB_URL}/planos?product_key=talk`,
    desc: "Atendimento via WhatsApp com automação e CRM integrado.",
  },
  {
    name: "Vincula CRM",
    color: "#8b5cf6",
    url: `${HUB_URL}/planos?product_key=crm`,
    desc: "Gestão de leads, pipeline e relacionamento com clientes.",
  },
  {
    name: "Fluvia",
    color: "#0a3d6b",
    url: "https://fluvia.prymeiradigital.com.br/landing",
    desc: "Controle financeiro e fluxo de caixa para sua empresa.",
  },
  {
    name: "Velio",
    color: "#f0c040",
    url: "https://velio.prymeiradigital.com.br/landing",
    desc: "Automatize e orquestre seus processos internos.",
  },
  {
    name: "Operis",
    color: "#f97316",
    url: "https://operis.prymeiradigital.com.br/landing",
    desc: "Sistema operacional pessoal para disciplina e execução.",
  },
  {
    name: "Flowcut",
    color: "#fcc009",
    url: "https://flowcut.prymeiradigital.com.br/landing",
    desc: "Transforme vídeos longos em cortes prontos para publicar.",
  },
];

const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    priceMonthly: 97,
    priceAnnual: 797,
    products: ["Talk", "Vincula CRM"],
  },
  {
    id: "empresa",
    name: "Empresa",
    priceMonthly: 147,
    priceAnnual: 1197,
    products: ["Talk", "Vincula CRM", "Fluvia"],
    recommended: true,
  },
  {
    id: "empresa-pro",
    name: "Empresa Pro",
    priceMonthly: 197,
    priceAnnual: 1597,
    products: ["Talk", "Vincula CRM", "Fluvia", "Velio"],
  },
  {
    id: "suite",
    name: "Suite Completa",
    priceMonthly: 247,
    priceAnnual: 1997,
    products: ["Talk", "Vincula CRM", "Fluvia", "Velio", "Operis", "Flowcut"],
  },
];

const PAIN_CARDS = [
  {
    title: "WhatsApp pago",
    subtitle: "R$ 300–800/mês",
    desc: "Plataformas de atendimento via WhatsApp cobram por conexão, por agente, por mensagem.",
  },
  {
    title: "CRM separado",
    subtitle: "R$ 200–600/mês",
    desc: "Salesforce, HubSpot, RD Station — cada um com seu contrato e sua curva de aprendizado.",
  },
  {
    title: "Financeiro",
    subtitle: "R$ 300–900/mês",
    desc: "Conta Azul, Nibo, Omie — mais um sistema, mais uma integração, mais um custo.",
  },
];

// ─── Responsive hook ─────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return isMobile;
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ isMobile }: { isMobile: boolean }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#0a0a09",
        borderBottom: "1px solid #1a1a18",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 20px" : "0 48px",
        height: 64,
        fontFamily: FONT,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={logomark} alt="" width={28} height={28} style={{ display: "block" }} />
        <img src={logotype} alt="Prymeira" height={18} style={{ display: "block" }} />
      </div>

      {/* Anchor links — desktop only */}
      {!isMobile && (
        <div style={{ display: "flex", gap: 32 }}>
          {(
            [
              ["Produtos", "#produtos"],
              ["Planos", "#planos"],
              ["Comparativo", "#comparativo"],
            ] as const
          ).map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{ color: "#a0a09e", fontSize: 14, textDecoration: "none", fontFamily: FONT }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#a0a09e")}
            >
              {label}
            </a>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {!isMobile && (
          <a
            href={HUB_URL}
            style={{ color: "#a0a09e", fontSize: 14, textDecoration: "none", fontFamily: FONT }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#a0a09e")}
          >
            Entrar
          </a>
        )}
        <a
          href={HUB_SIGNUP_URL}
          style={{
            background: "#fcc009",
            color: "#0a0a09",
            padding: "8px 18px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: FONT,
            whiteSpace: "nowrap",
          }}
        >
          Criar conta
        </a>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      style={{
        background: "#0a0a09",
        padding: isMobile ? "72px 20px 64px" : "96px 48px 80px",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            background: "#1a1a18",
            border: "1px solid #2a2a28",
            color: "#a0a09e",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "5px 12px",
            borderRadius: 20,
            marginBottom: 32,
            textTransform: "uppercase",
          }}
        >
          PREÇO DE FUNDADOR · PRIMEIROS 100 CLIENTES
        </div>

        {/* Headline */}
        <h1
          style={{
            color: "#fff",
            fontSize: isMobile ? 32 : 52,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 24px",
          }}
        >
          O stack completo por menos do que
          <br />
          você paga{" "}
          <span style={{ color: "#fcc009" }}>num produto só.</span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            color: "#8a8a88",
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.6,
            margin: "0 0 40px",
          }}
        >
          Talk + CRM + Financeiro + Operações + Conteúdo. Tudo conectado. Um login.{" "}
          <span style={{ color: "#fff" }}>A partir de R$ 97/mês.</span>
        </p>

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 48,
          }}
        >
          <a
            href={HUB_SIGNUP_URL}
            style={{
              background: "#fcc009",
              color: "#0a0a09",
              padding: "14px 28px",
              borderRadius: 7,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Criar conta grátis →
          </a>
          <a
            href="#planos"
            style={{
              background: "transparent",
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 7,
              border: "1px solid #2a2a28",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Ver planos
          </a>
        </div>

        {/* Product badges */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {PRODUCTS.map((p) => (
            <span
              key={p.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#1a1a18",
                border: "1px solid #2a2a28",
                padding: "5px 12px",
                borderRadius: 20,
                color: "#c0c0be",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                }}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Problema ─────────────────────────────────────────────────────────────────

function Problema({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      style={{
        background: "#fafaf8",
        padding: isMobile ? "64px 20px" : "80px 48px",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            color: "#0a0a09",
            fontSize: isMobile ? 26 : 38,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 16px",
            textAlign: "center",
          }}
        >
          Sua empresa já usa 5 ferramentas.
          <br />E paga por cada uma separado.
        </h2>
        <p
          style={{
            color: "#5a5a58",
            fontSize: 17,
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 48px",
          }}
        >
          Quando você soma tudo, chega a R$ 2.000–5.000 por mês. Para o mesmo stack que a Prymeira
          entrega por R$ 97.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {PAIN_CARDS.map((card) => (
            <div
              key={card.title}
              style={{
                background: "#fff9f9",
                border: "1px solid #fee2e2",
                borderRadius: 10,
                padding: 24,
              }}
            >
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {card.subtitle}
              </div>
              <h3
                style={{
                  color: "#0a0a09",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  margin: "0 0 8px",
                }}
              >
                {card.title}
              </h3>
              <p style={{ color: "#6a6a68", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Produtos ─────────────────────────────────────────────────────────────────

function Produtos({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      id="produtos"
      style={{
        background: "#ffffff",
        padding: isMobile ? "64px 20px" : "80px 48px",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            color: "#0a0a09",
            fontSize: isMobile ? 26 : 38,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 48px",
            textAlign: "center",
          }}
        >
          Tudo que você precisa, num ecossistema só
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              style={{
                background: "#fff",
                border: "1px solid #e8e8e4",
                borderRadius: 10,
                padding: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "#0a0a09",
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.name}
                  </span>
                </div>
                <a
                  href={p.url}
                  style={{
                    color: p.color,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Conhecer →
                </a>
              </div>
              <p style={{ color: "#6a6a68", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparativo ─────────────────────────────────────────────────────────────

function Comparativo({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      id="comparativo"
      style={{
        background: "#0a0a09",
        padding: isMobile ? "64px 20px" : "80px 48px",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            background: "#1a1a18",
            border: "1px solid #2a2a28",
            color: "#a0a09e",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "5px 12px",
            borderRadius: 20,
            marginBottom: 24,
            textTransform: "uppercase",
          }}
        >
          COMPARATIVO DE MERCADO
        </div>

        <h2
          style={{
            color: "#fff",
            fontSize: isMobile ? 26 : 38,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 48px",
          }}
        >
          Stack Prymeira vs. pagar separado
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Mercado */}
          <div
            style={{
              background: "#111110",
              border: "1px solid #1f1f1d",
              borderRadius: 10,
              padding: 32,
              textAlign: "left",
            }}
          >
            <div style={{ color: "#6a6a68", fontSize: 13, marginBottom: 12 }}>Mercado</div>
            <div
              style={{
                color: "#fff",
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              R$ 2.000
              <span style={{ fontSize: 18, fontWeight: 400, color: "#6a6a68" }}>/mês</span>
            </div>
            <div style={{ color: "#4a4a48", fontSize: 13, marginTop: 10 }}>
              Estimativa mínima para stack equivalente*
            </div>
          </div>

          {/* Prymeira */}
          <div
            style={{
              background: "#111110",
              border: "2px solid #fcc009",
              borderRadius: 10,
              padding: 32,
              textAlign: "left",
            }}
          >
            <div
              style={{ color: "#fcc009", fontSize: 13, fontWeight: 600, marginBottom: 12 }}
            >
              Prymeira Suite
            </div>
            <div
              style={{
                color: "#fcc009",
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              R$ 247
              <span style={{ fontSize: 18, fontWeight: 400, color: "#a0a09e" }}>/mês</span>
            </div>
            <div style={{ color: "#6a6a68", fontSize: 13, marginTop: 10 }}>
              Stack completo, um login, sem surpresas
            </div>
          </div>
        </div>

        <p style={{ color: "#4a4a48", fontSize: 12, margin: 0 }}>
          *Estimativa baseada em ferramentas equivalentes no mercado brasileiro
        </p>
      </div>
    </section>
  );
}

// ─── Planos ───────────────────────────────────────────────────────────────────

function Planos({ isMobile }: { isMobile: boolean }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <section
      id="planos"
      style={{
        background: "#fafaf8",
        padding: isMobile ? "64px 20px" : "80px 48px",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2
          style={{
            color: "#0a0a09",
            fontSize: isMobile ? 26 : 38,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          Escolha seu ponto de entrada
        </h2>
        <p
          style={{
            color: "#5a5a58",
            fontSize: 16,
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 32px",
          }}
        >
          Comece pelo que faz sentido agora. Expanda quando precisar.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "0 auto 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#eeeeec",
              borderRadius: 8,
              padding: 4,
            }}
          >
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  background: billing === b ? "#fff" : "transparent",
                  color: billing === b ? "#0a0a09" : "#6a6a68",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 20px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: FONT,
                  boxShadow: billing === b ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {b === "monthly" ? "Mensal" : "Anual"}
                {b === "annual" && (
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#16a34a",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                    }}
                  >
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards — 2×2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: "#fff",
                border: plan.recommended ? "2px solid #fcc009" : "1px solid #e8e8e4",
                borderRadius: 10,
                padding: 28,
                position: "relative",
                boxShadow: plan.recommended
                  ? "0 4px 20px rgba(252,192,9,0.12)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {plan.recommended && (
                <div
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fcc009",
                    color: "#0a0a09",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    padding: "4px 12px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Mais popular
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    color: "#0a0a09",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {plan.name}
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    color: "#0a0a09",
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                  }}
                >
                  R${" "}
                  {billing === "monthly"
                    ? plan.priceMonthly
                    : Math.round(plan.priceAnnual / 12)}
                </span>
                <span style={{ color: "#8a8a88", fontSize: 14 }}>/mês</span>
                {billing === "annual" && (
                  <div style={{ color: "#6a6a68", fontSize: 12, marginTop: 2 }}>
                    R$ {plan.priceAnnual}/ano
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                {plan.products.map((prodName) => {
                  const prod = PRODUCTS.find((x) => x.name === prodName);
                  return (
                    <div
                      key={prodName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 0",
                        color: "#3a3a38",
                        fontSize: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: prod?.color ?? "#aaa",
                          flexShrink: 0,
                        }}
                      />
                      {prodName}
                    </div>
                  );
                })}
              </div>

              <a
                href={HUB_PLANS_URL}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: plan.recommended ? "#fcc009" : "#0a0a09",
                  color: plan.recommended ? "#0a0a09" : "#fff",
                  padding: "11px 0",
                  borderRadius: 7,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Assinar
              </a>
            </div>
          ))}
        </div>

        {/* Solo plans note */}
        <p style={{ color: "#5a5a58", fontSize: 14, textAlign: "center", margin: "0 0 12px" }}>
          Prefere um produto só?{" "}
          <a
            href="https://operis.prymeiradigital.com.br/landing"
            style={{ color: "#f97316", textDecoration: "none", fontWeight: 600 }}
          >
            Operis (R$ 49)
          </a>{" "}
          e{" "}
          <a
            href="https://flowcut.prymeiradigital.com.br/landing"
            style={{ color: "#fcc009", textDecoration: "none", fontWeight: 600 }}
          >
            Flowcut (R$ 79)
          </a>
        </p>
        <p style={{ textAlign: "center", margin: 0 }}>
          <a
            href={HUB_PLANS_URL}
            style={{ color: "#0a0a09", fontSize: 14, fontWeight: 600, textDecoration: "underline" }}
          >
            Ver todos os planos →
          </a>
        </p>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────

function CtaFinal({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      style={{
        background: "#0a0a09",
        padding: isMobile ? "72px 20px" : "96px 48px",
        fontFamily: FONT,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            background: "#1a1a18",
            border: "1px solid #2a2a28",
            color: "#a0a09e",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "5px 12px",
            borderRadius: 20,
            marginBottom: 24,
            textTransform: "uppercase",
          }}
        >
          PREÇO DE FUNDADOR
        </div>

        <h2
          style={{
            color: "#fff",
            fontSize: isMobile ? 30 : 44,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 16px",
          }}
        >
          Entre antes que o preço suba.
        </h2>

        <p
          style={{
            color: "#8a8a88",
            fontSize: 17,
            lineHeight: 1.6,
            margin: "0 0 40px",
          }}
        >
          Primeiros 100 workspaces travam o preço para sempre.
        </p>

        <a
          href={HUB_SIGNUP_URL}
          style={{
            display: "inline-block",
            background: "#fcc009",
            color: "#0a0a09",
            padding: "16px 40px",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Criar conta grátis →
        </a>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ isMobile }: { isMobile: boolean }) {
  return (
    <footer
      style={{
        background: "#050505",
        borderTop: "1px solid #111110",
        padding: isMobile ? "32px 20px" : "32px 48px",
        fontFamily: FONT,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span style={{ color: "#4a4a48", fontSize: 13 }}>© 2026 Prymeira Digital</span>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {PRODUCTS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            style={{ color: "#4a4a48", fontSize: 13, textDecoration: "none" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#8a8a88")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#4a4a48")}
          >
            {p.name}
          </a>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {(
          [
            ["Termos de uso", "/termos"],
            ["Privacidade", "/privacidade"],
            ["Suporte", "/suporte"],
          ] as const
        ).map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{ color: "#4a4a48", fontSize: 13, textDecoration: "none" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#8a8a88")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#4a4a48")}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ─── LandingPage ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const isMobile = useIsMobile();

  return (
    <div style={{ fontFamily: FONT }}>
      <Navbar isMobile={isMobile} />
      <Hero isMobile={isMobile} />
      <Problema isMobile={isMobile} />
      <Produtos isMobile={isMobile} />
      <Comparativo isMobile={isMobile} />
      <Planos isMobile={isMobile} />
      <CtaFinal isMobile={isMobile} />
      <Footer isMobile={isMobile} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
pnpm --filter @prymeira/hub-web build
```

Expected: build completes with no TypeScript errors. If you see errors, read them carefully — they will point to exactly which line and what is wrong.

- [ ] **Step 3: Full visual check at `/landing-preview`**

Open `http://localhost:5175/landing-preview` in a browser. Scroll top to bottom and verify each section renders correctly:

| Section | What to check |
|---|---|
| Navbar | Sticky dark bar — logo left, 3 anchor links center, "Entrar" + gold "Criar conta" right |
| Hero | Dark background, badge at top, headline with gold "num produto só.", subheadline, gold CTA + ghost CTA, 6 colored product pills |
| Problema | Cream background, headline, 3 cards with red border and red price tag |
| Produtos | White background, 3-column grid of product cards, colored dot + name + "Conhecer →" link in brand color |
| Comparativo | Dark background, badge, 2 side-by-side cards — left normal, right with gold border |
| Planos | Cream background, toggle Mensal/Anual, 2×2 grid, "Empresa" card has gold border and "Mais popular" tag |
| CTA Final | Dark background, badge, headline, gold button |
| Footer | Very dark background, 3 columns with product links and legal links |

- [ ] **Step 4: Test the billing toggle**

Click "Anual" in the Planos section toggle. Verify:
- Toggle button shifts to Anual
- Prices change (e.g. Start shows R$ 66/mês instead of R$ 97/mês — `Math.round(797 / 12) = 66`)
- Annual total appears below each price (e.g. "R$ 797/ano")

Click "Mensal" back. Verify prices return to original.

- [ ] **Step 5: Test mobile layout**

In browser DevTools, set viewport width to 375px (or any width < 768px). Verify:
- Navbar: shows logo + "Criar conta" only (no anchor links, no "Entrar")
- All grids collapse to single column
- Text sizes are smaller
- Footer stacks vertically

- [ ] **Step 6: Test anchor links**

Click "Planos" in the navbar (desktop viewport). Verify the page scrolls to the Planos section.
Click "Ver planos" ghost button in Hero. Verify same.

- [ ] **Step 7: Commit**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
git add apps/hub-web/src/LandingPage.tsx
git commit -m "feat: implement LandingPage with all 8 sections and mobile responsiveness"
```

---

## Task 3: Traefik config — root domain routing

**Files:**
- Modify: `deploy/portainer-prymeira-account.yml`

This task adds two new Traefik router labels to the `prymeira_hub_web` service so that `prymeiradigital.com.br` and `www.prymeiradigital.com.br` are routed to the same container that already serves `hub.prymeiradigital.com.br`. No new services or containers needed — the `prymeira-hub` service (load balancer) is reused by the new router.

- [ ] **Step 1: Add Traefik labels to `portainer-prymeira-account.yml`**

Locate the `deploy.labels` block for `prymeira_hub_web` (currently ends at line 90):

```yaml
        - traefik.http.services.prymeira-hub.loadbalancer.server.port=80
```

Add these 4 lines immediately after it:

```yaml
        - traefik.http.routers.prymeira-root.rule=Host(`prymeiradigital.com.br`) || Host(`www.prymeiradigital.com.br`)
        - traefik.http.routers.prymeira-root.entrypoints=websecure
        - traefik.http.routers.prymeira-root.tls.certresolver=letsencryptresolver
        - traefik.http.routers.prymeira-root.service=prymeira-hub
```

> Note: `prymeira-root` is a new router name. It reuses `prymeira-hub` as the service (same backend — the hub-web container port 80). Traefik will request a TLS certificate for both apex and `www` automatically via `letsencryptresolver`.

The final labels block for `prymeira_hub_web` should look like this:

```yaml
      labels:
        - traefik.enable=true
        - traefik.docker.network=network_swarm_public
        - traefik.http.routers.prymeira-hub.rule=Host(`hub.prymeiradigital.com.br`)
        - traefik.http.routers.prymeira-hub.entrypoints=websecure
        - traefik.http.routers.prymeira-hub.tls.certresolver=letsencryptresolver
        - traefik.http.routers.prymeira-hub.service=prymeira-hub
        - traefik.http.services.prymeira-hub.loadbalancer.server.port=80
        - traefik.http.routers.prymeira-root.rule=Host(`prymeiradigital.com.br`) || Host(`www.prymeiradigital.com.br`)
        - traefik.http.routers.prymeira-root.entrypoints=websecure
        - traefik.http.routers.prymeira-root.tls.certresolver=letsencryptresolver
        - traefik.http.routers.prymeira-root.service=prymeira-hub
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
git add deploy/portainer-prymeira-account.yml
git commit -m "feat: add Traefik routing for prymeiradigital.com.br root domain"
```

- [ ] **Step 3: Push all commits**

```bash
cd "/Users/yohannreimer/Downloads/Locais/Prymeira Account"
git push
```

---

## Self-Review

Spec coverage check:

| Spec requirement | Task | Status |
|---|---|---|
| `isLandingHost` hostname check | Task 1 | Covered |
| `isLandingPreview` pathname check | Task 1 | Covered |
| No auth wrapper for LandingPage | Task 1 (early return before Clerk) | Covered |
| Navbar: sticky dark, logo, 3 links, Entrar + Criar conta | Task 2 | Covered |
| Navbar mobile: logo + Criar conta only | Task 2 (`!isMobile` guard on links/Entrar) | Covered |
| Hero: badge, headline, gold highlight, sub, 2 CTAs, 6 product pills | Task 2 | Covered |
| Problema: 3 pain cards with `#fee2e2` border | Task 2 | Covered |
| Produtos: grid, Conhecer links per product | Task 2 | Covered |
| Talk/Vincula → `/planos?product_key=X` | Task 2 (PRODUCTS const) | Covered |
| Others → `{subdomain}/landing` | Task 2 (PRODUCTS const) | Covered |
| Comparativo: dark, badge, 2 cards, gold border on Prymeira card | Task 2 | Covered |
| Planos: toggle monthly/annual, 2×2 grid, recommended badge | Task 2 | Covered |
| Assinar → `hub.prymeiradigital.com.br/planos` | Task 2 | Covered |
| Solo plan note (Operis R$49, Flowcut R$79) | Task 2 | Covered |
| CTA Final: badge, headline, sub, gold button | Task 2 | Covered |
| Footer: copyright, product links, legal links | Task 2 | Covered |
| Mobile breakpoint 768px | Task 2 (`useIsMobile` hook) | Covered |
| Inline styles only | Task 2 | Covered |
| Traefik labels for root domain | Task 3 | Covered |
