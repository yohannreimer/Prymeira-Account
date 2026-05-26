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
