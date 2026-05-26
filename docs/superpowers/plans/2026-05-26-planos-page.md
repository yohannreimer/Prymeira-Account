# /planos Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/planos` pricing page on `hub-web` and the `POST /checkout` + Stripe webhook on `account-api`, enabling users to subscribe to Prymeira packages via Stripe Checkout.

**Architecture:** `PlansPage.tsx` is a standalone React component with static plan data and a `billing` toggle. It sends `{ plan_id, billing }` to `POST /checkout` on `account-api`, which creates a Stripe Checkout Session and returns a URL. A Stripe webhook on `POST /webhook/stripe` verifies the event signature and grants entitlements via the existing `upsertEntitlement()` service.

**Tech Stack:** React + TypeScript (hub-web), Fastify + Prisma + Zod + Stripe Node SDK (account-api), Clerk (auth in hub-web; `authVerifier.verifyBearerToken` in account-api), Vitest (tests).

---

## File Map

**Create:**
- `apps/hub-web/src/PlansPage.tsx` — plans page component
- `apps/account-api/src/modules/checkout/checkout.service.ts` — Stripe session creation
- `apps/account-api/src/modules/checkout/checkout.routes.ts` — POST /checkout
- `apps/account-api/src/modules/checkout/checkout.routes.test.ts`
- `apps/account-api/src/modules/webhook/webhook.service.ts` — event handler + entitlement grant
- `apps/account-api/src/modules/webhook/webhook.routes.ts` — POST /webhook/stripe
- `apps/account-api/src/modules/webhook/webhook.routes.test.ts`

**Modify:**
- `apps/hub-web/src/products.ts` — add `talk` product presentation
- `apps/hub-web/src/styles.css` — add plans page CSS classes
- `apps/hub-web/src/api.ts` — add `createCheckoutSession()`
- `apps/hub-web/src/App.tsx` — add `isPlansRoute` routing
- `apps/account-api/src/env.ts` — add Stripe env vars
- `apps/account-api/src/app.ts` — register checkout + webhook routes

---

## Task 1: Add `talk` to products.ts

**Files:**
- Modify: `apps/hub-web/src/products.ts`

The package cards will list `talk` as a product. Without an entry in `productPresentationByKey`, it falls back to a generic Compass icon. Add a proper entry.

- [ ] **Step 1: Add the `talk` entry**

In `apps/hub-web/src/products.ts`, add `MessageCircle` to the lucide-react import and add the entry to `productPresentationByKey`:

```ts
import {
  BadgeDollarSign,
  Brain,
  ChartNoAxesCombined,
  Clapperboard,
  Compass,
  LucideIcon,
  Megaphone,
  MessageCircle,
  Settings2,
  ShoppingBag
} from "lucide-react";
```

Add to `productPresentationByKey`:
```ts
  talk: {
    accent: "#2a5f4a",
    category: "Comunicação",
    icon: MessageCircle,
    description: "Central de comunicação via WhatsApp. Atenda clientes, gerencie conversas e automatize respostas — tudo integrado ao CRM."
  },
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/hub-web/src/products.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add talk product presentation"
```

---

## Task 2: Plans page CSS in `styles.css`

**Files:**
- Modify: `apps/hub-web/src/styles.css` (append before the `/* RESPONSIVE */` block)

No tests needed for CSS. Verify visually after Task 4.

- [ ] **Step 1: Append the plans page classes**

Insert the following block immediately before the `/* ─── RESPONSIVE ─── */` comment (before line 1303 in the current file):

```css
/* ─── PLANS PAGE ─── */
.plans-page { max-width: 1120px; margin: 0 auto; padding: 40px 32px 80px; }
.plans-ctx-banner { background: #2a2200; border: 1px solid #5a4800; border-radius: 10px; padding: 14px 20px; margin-bottom: 36px; font-size: 13px; color: var(--gold); display: flex; align-items: center; gap: 10px; }
.plans-success-banner { background: #0a2a12; border: 1px solid #1a5c2a; border-radius: 10px; padding: 14px 20px; margin-bottom: 36px; font-size: 13px; color: #4ade80; display: flex; align-items: center; gap: 10px; }
.plans-hd { text-align: center; margin-bottom: 36px; }
.plans-hd__eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }
.plans-hd__title { font-family: var(--serif); font-size: 36px; font-weight: 700; color: var(--cream); line-height: 1.15; margin-bottom: 12px; }
.plans-hd__sub { font-size: 15px; color: var(--muted); max-width: 540px; margin: 0 auto; line-height: 1.6; }

.plans-toggle { display: flex; justify-content: center; margin-bottom: 40px; }
.plans-toggle__inner { display: flex; background: #111; border: 1px solid var(--rule); border-radius: 10px; padding: 3px; gap: 2px; }
.plans-toggle-btn { padding: 7px 20px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; background: transparent; color: var(--muted); transition: background .15s, color .15s; display: flex; align-items: center; gap: 7px; }
.plans-toggle-btn--active { background: var(--gold); color: #0d0d0c; }
.plans-toggle-badge { background: #1e3a1e; color: #4ade80; border-radius: 4px; padding: 2px 7px; font-size: 9px; font-weight: 800; }

.plans-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 48px; }
.pkg { background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 24px 20px 20px; display: flex; flex-direction: column; gap: 0; transition: border-color .15s; }
.pkg--recommended { border-color: var(--gold); position: relative; }
.pkg--highlighted { border-color: var(--gold); box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 18%, transparent); }
.pkg__badge { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 3px 9px; border-radius: 5px; margin-bottom: 16px; width: fit-content; }
.pkg__badge--pop { background: var(--gold); color: #0d0d0c; }
.pkg__badge--incl { background: transparent; border: 1px solid var(--gold); color: var(--gold); }
.pkg__icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.pkg__name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); margin-bottom: 8px; }
.pkg__price { font-family: var(--serif); font-size: 34px; font-weight: 700; color: var(--cream); line-height: 1; margin-bottom: 4px; }
.pkg__price em { font-size: 17px; font-style: normal; }
.pkg__price-period { font-size: 11px; color: var(--muted); margin-bottom: 20px; line-height: 1.5; }
.pkg__divider { height: 1px; background: var(--rule); margin-bottom: 16px; }
.pkg__products { list-style: none; padding: 0; margin: 0 0 auto; display: flex; flex-direction: column; gap: 8px; }
.pkg__product { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--text); }
.pkg__product-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pkg__cta { margin-top: 22px; width: 100%; padding: 11px; border-radius: 9px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: opacity .15s; }
.pkg__cta:disabled { opacity: .5; cursor: default; }
.pkg__cta--gold { background: var(--gold); color: #0d0d0c; }
.pkg__cta--primary { background: var(--cream); color: #0d0d0c; }
.pkg__cta--ghost { background: transparent; border: 1px solid var(--rule); color: var(--text); }
.pkg__err { margin-top: 8px; font-size: 11px; color: #f87171; text-align: center; }

.plans-solos-hd { text-align: center; margin-bottom: 24px; }
.plans-solos-hd__title { font-size: 18px; font-weight: 700; color: var(--cream); margin-bottom: 6px; }
.plans-solos-hd__sub { font-size: 13px; color: var(--muted); }
.plans-solos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 60px; }
.solo { background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 22px 24px; display: flex; align-items: center; gap: 18px; transition: border-color .15s; }
.solo--highlighted { border-color: var(--gold); box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 18%, transparent); }
.solo__icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.solo__info { flex: 1; min-width: 0; }
.solo__name { font-size: 14px; font-weight: 700; color: var(--cream); margin-bottom: 3px; }
.solo__desc { font-size: 12px; color: var(--muted); line-height: 1.4; }
.solo__badge { margin-top: 6px; display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 3px 9px; border-radius: 5px; background: transparent; border: 1px solid var(--gold); color: var(--gold); width: fit-content; }
.solo__right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; }
.solo__price { font-family: var(--serif); font-size: 24px; font-weight: 700; color: var(--cream); line-height: 1; }
.solo__price em { font-size: 13px; font-style: normal; color: var(--muted); }
.solo__price-annual { font-size: 11px; color: #4ade80; }
.solo__cta { padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid var(--rule); background: transparent; color: var(--text); cursor: pointer; transition: opacity .15s; white-space: nowrap; }
.solo__cta:disabled { opacity: .5; cursor: default; }
.solo__err { font-size: 11px; color: #f87171; text-align: right; }

.plans-footer-note { text-align: center; max-width: 560px; margin: 0 auto; padding-bottom: 40px; }
.plans-footer-note__title { font-size: 14px; font-weight: 700; color: var(--cream); margin-bottom: 8px; }
.plans-footer-note__text { font-size: 13px; color: var(--muted); line-height: 1.6; }
.plans-footer-note__links { display: flex; justify-content: center; gap: 20px; margin-top: 16px; }
.plans-footer-note__link { font-size: 12px; color: var(--muted); text-decoration: none; }
.plans-footer-note__link:hover { color: var(--text); }

.plans-topbar-back { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); text-decoration: none; padding: 4px 0; }
.plans-topbar-back:hover { color: var(--text); }
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/hub-web/src/styles.css
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add plans page CSS classes"
```

---

## Task 3: Add `createCheckoutSession()` to `api.ts`

**Files:**
- Modify: `apps/hub-web/src/api.ts`

- [ ] **Step 1: Add the function**

Append to `apps/hub-web/src/api.ts`:

```ts
export async function createCheckoutSession(
  token: string,
  payload: {
    plan_id: string;
    billing: "monthly" | "annual";
    success_url: string;
    cancel_url: string;
  }
): Promise<{ checkout_url: string }> {
  const response = await fetch(`${accountApiUrl}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não foi possível iniciar o checkout."));
  }

  return response.json() as Promise<{ checkout_url: string }>;
}
```

Note: `readApiError` is already defined in `api.ts` — do not redefine it.

- [ ] **Step 2: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/hub-web/src/api.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add createCheckoutSession API helper"
```

---

## Task 4: Create `PlansPage.tsx`

**Files:**
- Create: `apps/hub-web/src/PlansPage.tsx`

This is the largest frontend task. The component reads the URL for `?product_key` context and `?success=1`, renders the toggle + grid + solos, and calls `createCheckoutSession()` on CTA click.

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { createCheckoutSession } from "./api";
import { readProductPresentation } from "./products";
import logomark from "./assets/prymeira-selo.png";

// ─── Types ───────────────────────────────────────────────────────────────────

type Billing = "monthly" | "annual";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  productKeys: string[];
  recommended?: boolean;
};

type SoloPlan = {
  id: string;
  name: string;
  description: string;
  productKey: string;
  priceMonthly: number;
  priceAnnual: number;
};

// ─── Static data ─────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    priceMonthly: 97,
    priceAnnual: 797,
    productKeys: ["talk", "crm"]
  },
  {
    id: "empresa",
    name: "Empresa",
    priceMonthly: 147,
    priceAnnual: 1197,
    productKeys: ["talk", "crm", "financeiro"],
    recommended: true
  },
  {
    id: "empresa-pro",
    name: "Empresa Pro",
    priceMonthly: 197,
    priceAnnual: 1597,
    productKeys: ["talk", "crm", "financeiro", "orquestrador"]
  },
  {
    id: "suite",
    name: "Suite Completa",
    priceMonthly: 247,
    priceAnnual: 1997,
    productKeys: ["talk", "crm", "financeiro", "orquestrador", "media", "operis"]
  }
];

const SOLOS: SoloPlan[] = [
  {
    id: "operis",
    name: "Operis",
    description: "Sistema operacional pessoal para disciplina e execução.",
    productKey: "operis",
    priceMonthly: 49,
    priceAnnual: 397
  },
  {
    id: "media",
    name: "Flowcut",
    description: "Transforme vídeos longos em cortes prontos para publicar.",
    productKey: "media",
    priceMonthly: 79,
    priceAnnual: 647
  }
];

const PRODUCT_NAMES: Record<string, string> = {
  talk: "Talk",
  crm: "CRM",
  financeiro: "Financeiro",
  orquestrador: "Orquestrador",
  media: "Flowcut",
  operis: "Operis"
};

// ─── URL helpers ─────────────────────────────────────────────────────────────

function readPlansQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    productKey: params.get("product_key")?.trim() || null,
    success: params.get("success") === "1"
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlansPage() {
  const { getToken, isSignedIn } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { productKey: ctxProductKey, success } = readPlansQuery();
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ctxProductKey && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ctxProductKey]);

  async function handleSubscribe(planId: string) {
    if (!isSignedIn) {
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = `/?redirect_url=${redirect}`;
      return;
    }

    setLoadingId(planId);
    setErrors((prev) => ({ ...prev, [planId]: "" }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const origin = window.location.origin;
      const productParam = ctxProductKey ? `&product_key=${ctxProductKey}` : "";

      const { checkout_url } = await createCheckoutSession(token, {
        plan_id: planId,
        billing,
        success_url: `${origin}/planos?success=1${productParam}`,
        cancel_url: `${origin}/planos${ctxProductKey ? `?product_key=${ctxProductKey}` : ""}`
      });

      window.location.href = checkout_url;
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [planId]: err instanceof Error ? err.message : "Erro ao iniciar checkout."
      }));
      setLoadingId(null);
    }
  }

  const ctxProductName = ctxProductKey ? (PRODUCT_NAMES[ctxProductKey] ?? ctxProductKey) : null;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Topbar */}
      <header className="topbar" style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" className="plans-topbar-back">
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao Hub
        </a>
        <div style={{ flex: 1 }} />
        <img src={logomark} alt="Prymeira" height={28} />
        <div style={{ flex: 1 }} />
      </header>

      <main className="plans-page" role="main">
        {/* Context banner */}
        {ctxProductKey && !success && (
          <div className="plans-ctx-banner" role="alert">
            <Sparkles size={14} aria-hidden="true" />
            Você tentou acessar o <strong>{ctxProductName}</strong> — escolha um pacote que inclua este produto para liberar o acesso.
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="plans-success-banner" role="status">
            <CheckCircle size={14} aria-hidden="true" />
            Pagamento confirmado! Seu acesso será liberado em instantes.
          </div>
        )}

        {/* Header */}
        <div className="plans-hd">
          <p className="plans-hd__eyebrow">Escolha seu plano</p>
          <h1 className="plans-hd__title">Ferramentas Prymeira para a sua empresa crescer</h1>
          <p className="plans-hd__sub">Pacotes completos para times que precisam de CRM, financeiro, operações e conteúdo — tudo em um lugar.</p>
        </div>

        {/* Billing toggle */}
        <div className="plans-toggle">
          <div className="plans-toggle__inner">
            <button
              className={`plans-toggle-btn${billing === "monthly" ? " plans-toggle-btn--active" : ""}`}
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
            >
              Mensal
            </button>
            <button
              className={`plans-toggle-btn${billing === "annual" ? " plans-toggle-btn--active" : ""}`}
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
            >
              Anual
              {billing !== "annual" && (
                <span className="plans-toggle-badge">2 meses grátis</span>
              )}
            </button>
          </div>
        </div>

        {/* Package grid */}
        <div className="plans-grid" role="list">
          {PLANS.map((plan) => {
            const isHighlighted = ctxProductKey !== null && plan.productKeys.includes(ctxProductKey);
            const pres = readProductPresentation(plan.productKeys[0]);
            const isLoading = loadingId === plan.id;
            const ctaClass = plan.recommended
              ? "pkg__cta pkg__cta--gold"
              : isHighlighted
              ? "pkg__cta pkg__cta--primary"
              : "pkg__cta pkg__cta--ghost";

            const refProp = isHighlighted ? { ref: highlightedRef } : {};

            return (
              <div
                key={plan.id}
                className={`pkg${plan.recommended ? " pkg--recommended" : ""}${isHighlighted ? " pkg--highlighted" : ""}`}
                role="listitem"
                {...refProp}
              >
                {/* Badges */}
                {plan.recommended && (
                  <span className="pkg__badge pkg__badge--pop">✦ Mais popular</span>
                )}
                {isHighlighted && !plan.recommended && (
                  <span className="pkg__badge pkg__badge--incl">
                    ✦ Inclui {ctxProductName}
                  </span>
                )}

                {/* Icon */}
                <div
                  className="pkg__icon"
                  style={{ background: `${pres.accent}22` }}
                  aria-hidden="true"
                >
                  <pres.icon size={20} color={pres.accent} />
                </div>

                {/* Name */}
                <p className="pkg__name">{plan.name}</p>

                {/* Price */}
                <p className="pkg__price">
                  <em>R$</em>{" "}
                  {billing === "monthly"
                    ? plan.priceMonthly
                    : Math.round(plan.priceAnnual / 10)}
                </p>
                <p className="pkg__price-period">
                  {billing === "monthly"
                    ? "/mês · cobrado mensalmente"
                    : `/mês · cobrado R$ ${plan.priceAnnual.toLocaleString("pt-BR")}/ano`}
                </p>

                <div className="pkg__divider" />

                {/* Product list */}
                <ul className="pkg__products" aria-label={`Produtos incluídos em ${plan.name}`}>
                  {plan.productKeys.map((key) => {
                    const p = readProductPresentation(key);
                    return (
                      <li key={key} className="pkg__product">
                        <span
                          className="pkg__product-icon"
                          style={{ background: `${p.accent}22` }}
                          aria-hidden="true"
                        >
                          <p.icon size={12} color={p.accent} />
                        </span>
                        {PRODUCT_NAMES[key] ?? key}
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <button
                  className={ctaClass}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading || loadingId !== null}
                  aria-busy={isLoading}
                >
                  {isLoading ? "Aguarde..." : `Assinar ${plan.name}`}
                </button>
                {errors[plan.id] && (
                  <p className="pkg__err" role="alert">{errors[plan.id]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Solo products */}
        <div className="plans-solos-hd">
          <h2 className="plans-solos-hd__title">Produtos individuais</h2>
          <p className="plans-solos-hd__sub">Adicione ferramentas específicas ao seu stack.</p>
        </div>

        <div className="plans-solos" role="list">
          {SOLOS.map((solo) => {
            const isHighlighted = ctxProductKey === solo.productKey;
            const pres = readProductPresentation(solo.productKey);
            const isLoading = loadingId === solo.id;
            const refProp = isHighlighted ? { ref: highlightedRef } : {};

            return (
              <div
                key={solo.id}
                className={`solo${isHighlighted ? " solo--highlighted" : ""}`}
                role="listitem"
                {...refProp}
              >
                <div
                  className="solo__icon"
                  style={{ background: `${pres.accent}22` }}
                  aria-hidden="true"
                >
                  <pres.icon size={22} color={pres.accent} />
                </div>

                <div className="solo__info">
                  <p className="solo__name">{solo.name}</p>
                  <p className="solo__desc">{solo.description}</p>
                  {isHighlighted && (
                    <span className="solo__badge">✦ Inclui {ctxProductName}</span>
                  )}
                </div>

                <div className="solo__right">
                  <div>
                    <p className="solo__price">
                      R$ {billing === "monthly" ? solo.priceMonthly : Math.round(solo.priceAnnual / 10)}
                      <em>/mês</em>
                    </p>
                    {billing === "annual" && (
                      <p className="solo__price-annual">R$ {solo.priceAnnual}/ano</p>
                    )}
                  </div>
                  <button
                    className="solo__cta"
                    onClick={() => handleSubscribe(solo.id)}
                    disabled={isLoading || loadingId !== null}
                    aria-busy={isLoading}
                  >
                    {isLoading ? "Aguarde..." : "Assinar"}
                  </button>
                  {errors[solo.id] && (
                    <p className="solo__err" role="alert">{errors[solo.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="plans-footer-note">
          <p className="plans-footer-note__title">Uma palavra do fundador</p>
          <p className="plans-footer-note__text">
            Esses preços são intencionalmente agressivos. Estou construindo a Prymeira para que
            qualquer empresa possa acessar ferramentas de qualidade sem precisar pagar fortunas.
            Conforme crescemos, esses preços podem mudar — mas quem entrar agora, entra com as
            condições de fundador.
          </p>
          <div className="plans-footer-note__links">
            <a href="/termos" className="plans-footer-note__link">Termos de uso</a>
            <a href="/privacidade" className="plans-footer-note__link">Privacidade</a>
            <a href="/suporte" className="plans-footer-note__link">Suporte</a>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/hub-web/src/PlansPage.tsx
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add PlansPage component"
```

---

## Task 5: Wire routing in `App.tsx`

**Files:**
- Modify: `apps/hub-web/src/App.tsx`

- [ ] **Step 1: Add import and route check**

Add the import at the top of `App.tsx` (with the other local imports):

```ts
import { PlansPage } from "./PlansPage";
```

In the `App()` function (currently lines 750–770), add `isPlansRoute` alongside the other route checks:

```ts
export function App() {
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

- [ ] **Step 2: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/hub-web/src/App.tsx
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add /planos route to App"
```

---

## Task 6: Add Stripe env vars to `account-api/env.ts`

**Files:**
- Modify: `apps/account-api/src/env.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
cd /Users/yohannreimer/Downloads/Locais/Prymeira\ Account/apps/account-api && npm install stripe
```

Expected output: `added 1 package` (Stripe has no deps)

- [ ] **Step 2: Update `env.ts`**

Replace the entire file content with:

```ts
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: [".env", "../../.env"], quiet: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_ACTION_TOKEN: z.string().default(""),
  CORS_ORIGINS: z.string().default(""),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_START_MONTHLY: z.string().default(""),
  STRIPE_PRICE_START_ANNUAL: z.string().default(""),
  STRIPE_PRICE_EMPRESA_MONTHLY: z.string().default(""),
  STRIPE_PRICE_EMPRESA_ANNUAL: z.string().default(""),
  STRIPE_PRICE_EMPRESA_PRO_MONTHLY: z.string().default(""),
  STRIPE_PRICE_EMPRESA_PRO_ANNUAL: z.string().default(""),
  STRIPE_PRICE_SUITE_MONTHLY: z.string().default(""),
  STRIPE_PRICE_SUITE_ANNUAL: z.string().default(""),
  STRIPE_PRICE_OPERIS_MONTHLY: z.string().default(""),
  STRIPE_PRICE_OPERIS_ANNUAL: z.string().default(""),
  STRIPE_PRICE_MEDIA_MONTHLY: z.string().default(""),
  STRIPE_PRICE_MEDIA_ANNUAL: z.string().default("")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/package.json apps/account-api/package-lock.json apps/account-api/src/env.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add Stripe SDK and env vars to account-api"
```

---

## Task 7: Create `checkout.service.ts` and `checkout.routes.ts`

**Files:**
- Create: `apps/account-api/src/modules/checkout/checkout.service.ts`
- Create: `apps/account-api/src/modules/checkout/checkout.routes.ts`

- [ ] **Step 1: Create `checkout.service.ts`**

```ts
import Stripe from "stripe";
import type { Env } from "../../env.js";
import { ApiError } from "../../lib/errors.js";

type CreateCheckoutSessionInput = {
  planId: string;
  billing: "monthly" | "annual";
  clerkUserId: string;
  successUrl: string;
  cancelUrl: string;
};

function buildPriceIdMap(env: Env): Map<string, string> {
  return new Map([
    ["start:monthly",       env.STRIPE_PRICE_START_MONTHLY],
    ["start:annual",        env.STRIPE_PRICE_START_ANNUAL],
    ["empresa:monthly",     env.STRIPE_PRICE_EMPRESA_MONTHLY],
    ["empresa:annual",      env.STRIPE_PRICE_EMPRESA_ANNUAL],
    ["empresa-pro:monthly", env.STRIPE_PRICE_EMPRESA_PRO_MONTHLY],
    ["empresa-pro:annual",  env.STRIPE_PRICE_EMPRESA_PRO_ANNUAL],
    ["suite:monthly",       env.STRIPE_PRICE_SUITE_MONTHLY],
    ["suite:annual",        env.STRIPE_PRICE_SUITE_ANNUAL],
    ["operis:monthly",      env.STRIPE_PRICE_OPERIS_MONTHLY],
    ["operis:annual",       env.STRIPE_PRICE_OPERIS_ANNUAL],
    ["media:monthly",       env.STRIPE_PRICE_MEDIA_MONTHLY],
    ["media:annual",        env.STRIPE_PRICE_MEDIA_ANNUAL]
  ]);
}

export async function createCheckoutSession(
  stripe: Stripe,
  env: Env,
  input: CreateCheckoutSessionInput
): Promise<{ checkoutUrl: string }> {
  const key = `${input.planId}:${input.billing}`;
  const priceId = buildPriceIdMap(env).get(key);

  if (!priceId) {
    throw new ApiError(400, "VALIDATION_ERROR", `Unknown plan/billing combination: ${key}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      clerk_user_id: input.clerkUserId,
      plan_id: input.planId,
      billing: input.billing
    },
    client_reference_id: input.clerkUserId
  });

  if (!session.url) {
    throw new ApiError(500, "INTERNAL_ERROR", "Stripe did not return a checkout URL.");
  }

  return { checkoutUrl: session.url };
}
```

- [ ] **Step 2: Create `checkout.routes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loadEnv } from "../../env.js";
import Stripe from "stripe";
import { createCheckoutSession } from "./checkout.service.js";

const checkoutBodySchema = z.object({
  plan_id: z.string().min(1),
  billing: z.enum(["monthly", "annual"]),
  success_url: z.string().url(),
  cancel_url: z.string().url()
});

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post("/checkout", async (request, reply) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const body = checkoutBodySchema.parse(request.body);
    const env = loadEnv();

    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({
        error: { code: "INTERNAL_ERROR", message: "Checkout is not configured." }
      });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const { checkoutUrl } = await createCheckoutSession(stripe, env, {
      planId: body.plan_id,
      billing: body.billing,
      clerkUserId: user.clerkUserId,
      successUrl: body.success_url,
      cancelUrl: body.cancel_url
    });

    return reply.status(200).send({ checkout_url: checkoutUrl });
  });
};
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/src/modules/checkout/
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add checkout service and routes"
```

---

## Task 8: Create `webhook.service.ts` and `webhook.routes.ts`

**Files:**
- Create: `apps/account-api/src/modules/webhook/webhook.service.ts`
- Create: `apps/account-api/src/modules/webhook/webhook.routes.ts`

The webhook must parse the raw body (not JSON-parsed) for Stripe signature verification. Fastify's content type parser is scoped to the plugin, so it only affects this route.

- [ ] **Step 1: Create `webhook.service.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { upsertEntitlement } from "../entitlements/entitlements.service.js";

const PLAN_PRODUCT_KEYS: Record<string, string[]> = {
  start:        ["talk", "crm"],
  empresa:      ["talk", "crm", "financeiro"],
  "empresa-pro": ["talk", "crm", "financeiro", "orquestrador"],
  suite:        ["talk", "crm", "financeiro", "orquestrador", "media", "operis"],
  operis:       ["operis"],
  media:        ["media"]
};

export async function handleStripeEvent(
  prisma: PrismaClient,
  stripe: Stripe,
  event: Stripe.Event
): Promise<void> {
  if (event.type !== "checkout.session.completed") return;

  const session = event.data.object as Stripe.Checkout.Session;
  const clerkUserId = session.metadata?.clerk_user_id;
  const planId = session.metadata?.plan_id;

  if (!clerkUserId || !planId) return;

  const productKeys = PLAN_PRODUCT_KEYS[planId];
  if (!productKeys) return;

  const customer = await findCustomerByClerkUserId(prisma, clerkUserId);
  if (!customer) return;

  const membership = await prisma.workspaceMember.findFirst({
    where: { customerId: customer.id, status: "active" },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) return;

  const workspaceId = membership.workspaceId;

  let currentPeriodEndsAt: Date | null = null;
  if (session.subscription) {
    try {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      currentPeriodEndsAt = new Date(sub.current_period_end * 1000);
    } catch {
      // non-fatal: entitlement is still granted without expiry
    }
  }

  for (const productKey of productKeys) {
    await upsertEntitlement(prisma, { clerkUserId }, {
      workspaceId,
      productKey,
      status: "active",
      plan: planId,
      source: "stripe",
      currentPeriodEndsAt,
      endsAt: null,
      trialEndsAt: null,
      limits: {},
      metadata: {
        stripe_session_id: session.id,
        stripe_subscription_id: session.subscription ?? null
      },
      auditAction: "entitlement.stripe_checkout"
    });
  }
}
```

- [ ] **Step 2: Create `webhook.routes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { loadEnv } from "../../env.js";
import { handleStripeEvent } from "./webhook.service.js";

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  app.post("/webhook/stripe", async (request, reply) => {
    const env = loadEnv();

    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: { code: "INTERNAL_ERROR", message: "Webhook not configured." } });
    }

    const sig = request.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Missing stripe-signature header." } });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid webhook signature." } });
    }

    await handleStripeEvent(app.prisma, stripe, event);

    return reply.status(200).send({ received: true });
  });
};
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/src/modules/webhook/
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: add Stripe webhook service and routes"
```

---

## Task 9: Register routes in `app.ts`

**Files:**
- Modify: `apps/account-api/src/app.ts`

- [ ] **Step 1: Add imports and registrations**

At the top of `app.ts`, add two imports alongside the existing route imports:

```ts
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";
import { webhookRoutes } from "./modules/webhook/webhook.routes.js";
```

At the bottom of `buildApp()`, add the registrations after `teamRoutes`:

```ts
  await app.register(customersRoutes);
  await app.register(accessRoutes);
  await app.register(adminRoutes);
  await app.register(teamRoutes);
  await app.register(checkoutRoutes);
  await app.register(webhookRoutes);
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/yohannreimer/Downloads/Locais/Prymeira\ Account/apps/account-api && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/src/app.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "feat: register checkout and webhook routes"
```

---

## Task 10: Tests for `checkout.routes.ts`

**Files:**
- Create: `apps/account-api/src/modules/checkout/checkout.routes.test.ts`

The test uses the same `buildApp()` + mock Prisma pattern as `access.routes.test.ts`. Stripe is injected via `app.decorate` override — but since `buildApp` doesn't accept a stripe option, the route instantiates its own Stripe client. To make it testable without a real Stripe key, mock the service layer with `vi.mock`.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import { createStaticAuthVerifier } from "../../../test/auth-fixtures.js";
import * as checkoutService from "./checkout.service.js";

vi.mock("./checkout.service.js", () => ({
  createCheckoutSession: vi.fn()
}));

const authVerifier = createStaticAuthVerifier({
  clerkUserId: "user_123",
  email: "user@example.com"
});

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_PRICE_START_MONTHLY = "price_start_m";
  process.env.NODE_ENV = "test";
  vi.clearAllMocks();
});

describe("checkoutRoutes", () => {
  it("returns 401 when no auth header is provided", async () => {
    const app = await buildApp({ authVerifier });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeira.com/planos?success=1",
        cancel_url: "https://hub.prymeira.com/planos"
      }
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 400 when body is invalid", async () => {
    const app = await buildApp({ authVerifier });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: { plan_id: "start" }
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns checkout_url when service succeeds", async () => {
    vi.mocked(checkoutService.createCheckoutSession).mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_abc"
    });

    const app = await buildApp({ authVerifier });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeira.com/planos?success=1",
        cancel_url: "https://hub.prymeira.com/planos"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      checkout_url: "https://checkout.stripe.com/pay/cs_test_abc"
    });
    expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ STRIPE_SECRET_KEY: "sk_test_fake" }),
      expect.objectContaining({
        planId: "start",
        billing: "monthly",
        clerkUserId: "user_123"
      })
    );
    await app.close();
  });
});
```

- [ ] **Step 2: Run tests — expect failures initially**

```bash
cd /Users/yohannreimer/Downloads/Locais/Prymeira\ Account/apps/account-api && npm test -- --reporter=verbose modules/checkout
```

Expected: 3 tests failing (route doesn't exist yet — but it will pass now since we already created it in Task 7; if you're doing TDD strictly, write this file before Task 7).

- [ ] **Step 3: Run tests — verify they pass**

```bash
cd /Users/yohannreimer/Downloads/Locais/Prymeira\ Account/apps/account-api && npm test -- --reporter=verbose modules/checkout
```

Expected: 3 passing.

- [ ] **Step 4: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/src/modules/checkout/checkout.routes.test.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "test: add checkout routes integration tests"
```

---

## Task 11: Tests for `webhook.routes.ts`

**Files:**
- Create: `apps/account-api/src/modules/webhook/webhook.routes.test.ts`

The webhook test mocks `stripe.webhooks.constructEvent` and the service layer.

- [ ] **Step 1: Write the failing tests**

```ts
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import * as webhookService from "./webhook.service.js";

vi.mock("./webhook.service.js", () => ({
  handleStripeEvent: vi.fn()
}));

vi.mock("stripe", () => {
  const mockConstructEvent = vi.fn();
  const MockStripe = vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: vi.fn() }
  }));
  (MockStripe as any)._mockConstructEvent = mockConstructEvent;
  return { default: MockStripe };
});

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  process.env.NODE_ENV = "test";
  vi.clearAllMocks();
});

const mockPrisma = {} as unknown as PrismaClient;

describe("webhookRoutes", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: { "content-type": "application/json" },
      payload: Buffer.from('{"type":"checkout.session.completed"}')
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("returns 400 when stripe signature is invalid", async () => {
    const { default: Stripe } = await import("stripe");
    (Stripe as any)._mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });

    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid"
      },
      payload: Buffer.from('{"type":"checkout.session.completed"}')
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("calls handleStripeEvent and returns 200 on valid event", async () => {
    const fakeEvent = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_abc", metadata: { clerk_user_id: "user_123", plan_id: "start" } } }
    };
    const { default: Stripe } = await import("stripe");
    (Stripe as any)._mockConstructEvent.mockReturnValue(fakeEvent);
    vi.mocked(webhookService.handleStripeEvent).mockResolvedValue(undefined);

    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=123,v1=abc"
      },
      payload: Buffer.from(JSON.stringify(fakeEvent))
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(webhookService.handleStripeEvent).toHaveBeenCalledWith(
      mockPrisma,
      expect.any(Object),
      fakeEvent
    );
    await app.close();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/yohannreimer/Downloads/Locais/Prymeira\ Account/apps/account-api && npm test -- --reporter=verbose modules/webhook
```

Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" add apps/account-api/src/modules/webhook/webhook.routes.test.ts
git -C "/Users/yohannreimer/Downloads/Locais/Prymeira Account" commit -m "test: add webhook routes integration tests"
```

---

## Post-implementation: Configure Stripe env vars

After merging, configure these in `.env` (never commit):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_START_MONTHLY=price_...
STRIPE_PRICE_START_ANNUAL=price_...
STRIPE_PRICE_EMPRESA_MONTHLY=price_...
STRIPE_PRICE_EMPRESA_ANNUAL=price_...
STRIPE_PRICE_EMPRESA_PRO_MONTHLY=price_...
STRIPE_PRICE_EMPRESA_PRO_ANNUAL=price_...
STRIPE_PRICE_SUITE_MONTHLY=price_...
STRIPE_PRICE_SUITE_ANNUAL=price_...
STRIPE_PRICE_OPERIS_MONTHLY=price_...
STRIPE_PRICE_OPERIS_ANNUAL=price_...
STRIPE_PRICE_MEDIA_MONTHLY=price_...
STRIPE_PRICE_MEDIA_ANNUAL=price_...
```

Register `https://account.prymeira.com/webhook/stripe` as a Stripe webhook endpoint listening to `checkout.session.completed`.
