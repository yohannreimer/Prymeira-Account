import { useEffect, useMemo, useState } from "react";
import {
  ClerkLoading,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Grid2X2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  accountApiUrl,
  fetchAdminSession,
  fetchMyProducts,
  resolveProductUrl,
  syncCurrentCustomer,
} from "./api";
import { AdminPanel } from "./AdminPanel";
import { formatPlanLabel, formatProductLabel, formatRoleLabel, formatWorkspaceTypeLabel } from "./labels";
import { readProductPresentation } from "./products";
import type { AccountProductAccess, AccountProductsResponse } from "./types";
import logomark from "./assets/prymeira-selo.png";
import logotype from "./assets/prymeira-logo.png";
import "./styles.css";

type ProductGroup = {
  title: string;
  eyebrow: string;
  products: AccountProductAccess[];
};

function statusLabel(product: AccountProductAccess) {
  if (product.allowed && product.status === "trial") return "Teste";
  if (product.allowed) return product.plan ? `Ativo - ${formatPlanLabel(product.plan)}` : "Ativo";
  if (product.reason === "trial_expired") return "Teste expirado";
  if (product.status === "blocked") return "Bloqueado";
  return "Bloqueado";
}

function actionLabel(product: AccountProductAccess) {
  if (product.allowed) return "Abrir";
  if (product.reason === "trial_expired") return "Renovar";
  return product.marketing_url || product.upgrade_url ? "Conhecer" : "Indisponivel";
}

function accessReasonLabel(reason: string | null) {
  const labels: Record<string, string> = {
    no_customer: "Sua conta ainda não foi sincronizada com a Prymeira Account.",
    no_entitlement: "Este produto ainda não foi liberado para o seu workspace.",
    expired: "A permissão deste produto expirou.",
    blocked: "Este produto está bloqueado para o seu workspace.",
    cancelled: "A assinatura deste produto foi cancelada.",
    trial_expired: "O período de teste deste produto terminou.",
    product_access_denied: "A Prymeira Account não encontrou uma liberação ativa para este produto.",
    account_api_error: "Não foi possível confirmar a liberação deste produto agora."
  };

  return reason ? labels[reason] ?? "Este produto ainda não está liberado para a sua conta." : "Este produto ainda não está liberado para a sua conta.";
}

function readAccessDeniedQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    productKey: params.get("product_key")?.trim() || "operis",
    reason: params.get("reason")?.trim() || null,
    returnUrl: safeReturnUrl(params.get("return_url"))
  };
}

function safeReturnUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isPrymeiraHost = host === "prymeiradigital.com.br" || host.endsWith(".prymeiradigital.com.br");
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    return isPrymeiraHost || isLocalHost ? url.toString() : null;
  } catch {
    return null;
  }
}

function checkoutUrl(product: AccountProductAccess | null, productKey: string) {
  return (
    product?.upgrade_url
    ?? product?.marketing_url
    ?? `/planos?product_key=${encodeURIComponent(productKey)}`
  );
}

function productGroups(products: AccountProductAccess[]): ProductGroup[] {
  const active = products.filter((product) => product.allowed);
  const trial = products.filter((product) => !product.allowed && product.status === "trial");
  const locked = products.filter((product) => !product.allowed && product.status !== "trial");
  return [
    { title: "Produtos ativos", eyebrow: "Prontos para entrar", products: active },
    { title: "Disponíveis para testar", eyebrow: "Próximas liberações", products: trial },
    { title: "Bloqueados", eyebrow: "Assinatura ou liberação pendente", products: locked },
  ].filter((group) => group.products.length > 0);
}

function Logomark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={logomark}
      alt="Prymeira"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
    />
  );
}

function Logotype({ height = 22 }: { height?: number }) {
  return (
    <img
      src={logotype}
      alt="Prymeira"
      height={height}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
    />
  );
}

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
        <span className={`pcard__badge ${badgeClass(product)}`}>{statusLabel(product)}</span>
      </div>
      <div className="pcard__cat">{presentation.category}</div>
      <div className="pcard__name">{formatProductLabel(product.product_key) || product.name}</div>
      <p className="pcard__desc">
        {presentation.description ?? product.description ?? "Produto Prymeira conectado à sua conta central."}
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
            {product.allowed ? (
              <ArrowRight size={12} aria-hidden="true" />
            ) : (
              <Lock size={11} aria-hidden="true" />
            )}
          </a>
        )}
        {product.workspace_role && (
          <span className="pcard__meta">{formatRoleLabel(product.workspace_role)}</span>
        )}
      </div>
    </article>
  );
}

function AccessDeniedPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [{ productKey, reason, returnUrl }] = useState(readAccessDeniedQuery);
  const [data, setData] = useState<AccountProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getToken()
      .then((token) => {
        if (!token) throw new Error("Sessao Clerk sem token.");
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!user?.id || !email) {
          throw new Error("Perfil Clerk sem email principal.");
        }

        return syncCurrentCustomer(token, {
          clerk_user_id: user.id,
          email,
          name: user.fullName ?? user.firstName ?? undefined,
        }).then(() => fetchMyProducts(token));
      })
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getToken, user?.firstName, user?.fullName, user?.id, user?.primaryEmailAddress?.emailAddress]);

  const product = data?.products.find((item) => item.product_key === productKey) ?? null;
  const presentation = readProductPresentation(productKey);
  const Icon = presentation.icon;
  const productName = formatProductLabel(productKey) || product?.name || productKey;
  const isAllowed = product?.allowed === true;
  const appUrl = isAllowed ? resolveProductUrl(productKey, product?.app_url ?? returnUrl ?? "#") : null;
  const primaryUrl = isAllowed ? appUrl : checkoutUrl(product, productKey);
  const displayName = user?.firstName ?? user?.fullName ?? data?.customer?.email ?? "Conta";
  const workspaceName = data?.workspace?.name ?? "Área de trabalho";

  return (
    <div className="shell access-shell">
      <header className="topbar">
        <div className="topbar__logo">
          <Logotype height={22} />
        </div>
        <div className="topbar__sep" />
        <div className="topbar__workspace">
          <span className="topbar__ws-dot" />
          {workspaceName}
        </div>
        <div className="topbar__right">
          <a href="/" className="topbar__back-btn">
            Voltar ao Hub
          </a>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="access-page">
        <svg
          className="topo-pattern"
          viewBox="0 0 1120 520"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="#FCC009" strokeWidth=".9" opacity=".16">
            <ellipse cx="970" cy="190" rx="470" ry="210" />
            <ellipse cx="970" cy="190" rx="390" ry="172" />
            <ellipse cx="970" cy="190" rx="310" ry="136" />
            <ellipse cx="970" cy="190" rx="230" ry="98" />
            <ellipse cx="160" cy="380" rx="360" ry="164" />
            <ellipse cx="160" cy="380" rx="290" ry="130" />
            <ellipse cx="160" cy="380" rx="210" ry="94" />
            <ellipse cx="560" cy="-20" rx="300" ry="142" />
            <ellipse cx="560" cy="-20" rx="220" ry="104" />
          </g>
        </svg>
        <section className="access-hero">
          <div className="access-hero__copy">
            <div className="hub-hero__eyebrow">
              <span className={`hub-hero__eyebrow-dot${isAllowed ? "" : " hub-hero__eyebrow-dot--amber"}`} />
              Acesso de produto · {presentation.category}
            </div>
            <h1 className="access-hero__title">
              {isAllowed ? (
                <>
                  Acesso ao <em>{productName}</em> liberado.
                </>
              ) : (
                <>
                  Seu acesso ao <em>{productName}</em> ainda não está liberado.
                </>
              )}
            </h1>
            <p className="access-hero__text">
              {isAllowed
                ? "A Prymeira Account confirmou sua permissão. Você pode voltar para o produto ou continuar gerenciando tudo pelo Hub."
                : `${accessReasonLabel(reason ?? product?.reason ?? null)} Login, workspace e permissões ficam centralizados para manter cada app no seu próprio território.`}
            </p>
            {error && (
              <div className="access-alert" role="alert">
                <ShieldCheck size={15} aria-hidden="true" />
                {error} — {accountApiUrl}
              </div>
            )}
            <div className="access-hero__actions">
              <a className="access-cta access-cta--primary" href={primaryUrl ?? "/"}>
                {isAllowed ? "Abrir produto" : "Comprar agora"}
                <ArrowRight size={14} aria-hidden="true" />
              </a>
              <a className="access-cta access-cta--secondary" href="/">
                Voltar ao Hub
              </a>
              {returnUrl && !isAllowed && (
                <a className="access-cta access-cta--text" href={returnUrl}>
                  Tentar novamente
                </a>
              )}
            </div>
          </div>

          <aside className="access-card" aria-label="Resumo do produto">
            <div className="access-card__icon">
              <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div className="access-card__category">{presentation.category}</div>
            <h2 className="access-card__title">{productName}</h2>
            <p className="access-card__desc">
              {presentation.description ?? product?.description ?? "Produto Prymeira conectado à sua conta central."}
            </p>
            <div className="access-card__facts">
              <div>
                <span>Status</span>
                <strong>{isLoading ? "Verificando" : product ? statusLabel(product) : "Pendente"}</strong>
              </div>
              <div>
                <span>Plano</span>
                <strong>{product?.plan ? formatPlanLabel(product.plan) : "A definir"}</strong>
              </div>
              <div>
                <span>Conta</span>
                <strong>{displayName}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="access-steps" aria-label="Como funciona">
          <div className="access-step">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Clerk autentica</span>
          </div>
          <div className="access-step">
            <Lock size={18} aria-hidden="true" />
            <span>Account autoriza</span>
          </div>
          <div className="access-step">
            <Grid2X2 size={18} aria-hidden="true" />
            <span>Cada app obedece</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function Hub() {
  const { getToken } = useAuth();
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
        if (!token) throw new Error("Sessao Clerk sem token.");
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!user?.id || !email) {
          throw new Error("Perfil Clerk sem email principal.");
        }

        return syncCurrentCustomer(token, {
          clerk_user_id: user.id,
          email,
          name: user.fullName ?? user.firstName ?? undefined,
        }).then(() => fetchMyProducts(token));
      })
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getToken, user?.firstName, user?.fullName, user?.id, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    let active = true;
    getToken()
      .then((token) => {
        if (!token) throw new Error("Sessao Clerk sem token.");
        return fetchAdminSession(token);
      })
      .then(() => {
        if (!active) return;
        setIsAdmin(true);
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [getToken]);

  const groups = useMemo(() => productGroups(data?.products ?? []), [data]);
  const activeCount = data?.products.filter((p) => p.allowed).length ?? 0;
  const trialCount = data?.products.filter((p) => !p.allowed && p.status === "trial").length ?? 0;
  const lockedCount = data?.products.filter((p) => !p.allowed && p.status !== "trial").length ?? 0;
  const plan =
    ((data?.workspace as Record<string, unknown>)?.["plan"] as string | null | undefined)
    ?? data?.workspace?.type
    ?? null;
  const displayName =
    user?.firstName ?? user?.fullName ?? data?.customer?.email ?? "Conta";
  const workspaceName = data?.workspace?.name ?? "Área de trabalho";
  const planLabel = plan
    ? plan === data?.workspace?.type
      ? formatWorkspaceTypeLabel(plan)
      : formatPlanLabel(plan)
    : "—";

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
          <Logotype height={22} />
        </div>
        <div className="topbar__sep" />
        <div className="topbar__workspace">
          <span className="topbar__ws-dot" />
          {workspaceName}
        </div>
        <nav className="topbar__nav" aria-label="Principal">
          <span className="topbar__nav-item topbar__nav-item--active">Hub</span>
          <a className="topbar__nav-item" href="/planos">
            Planos
          </a>
          <a className="topbar__nav-item" href="/suporte">
            Suporte
          </a>
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
            <div className="topbar__avatar" aria-hidden="true">
              {initials}
            </div>
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
              Área de trabalho · {workspaceName}
            </div>
            <h1 className="hub-hero__h1">
              Olá, <em>{displayName}.</em>
            </h1>
            <p className="hub-hero__sub">
              Acesse, gerencie e expanda seus produtos Prymeira. Tudo centralizado, tudo no seu
              controle.
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
              <div
                className={`metric-card__val${trialCount === 0 ? " metric-card__val--faint" : ""}`}
              >
                {trialCount}
              </div>
              <div className="metric-card__lbl">Testes</div>
            </div>
            <div className="metric-card">
              <div
                className={`metric-card__val${lockedCount === 0 ? " metric-card__val--faint" : ""}`}
              >
                {lockedCount}
              </div>
              <div className="metric-card__lbl">Bloqueados</div>
            </div>
            <div className="metric-card metric-card--dark">
              <div className="metric-card__plan-label">Plano</div>
              <div className="metric-card__plan-name">{planLabel}</div>
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
              <span>
                {error} — {accountApiUrl}
              </span>
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
                <span
                  className={`section-hd__dot section-hd__dot--${
                    group.title.includes("ativo")
                      ? "green"
                      : group.title.includes("testar")
                        ? "amber"
                        : "gray"
                  }`}
                />
                <span className="section-hd__title">{group.title}</span>
                <span className="section-hd__count">{group.products.length}</span>
              </div>
              <div
                className={`product-grid${group.products.length <= 2 ? " product-grid--2" : ""}`}
              >
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
          <a className="hub-footer__link" href="/termos">
            Termos de uso
          </a>
          <a className="hub-footer__link" href="/privacidade">
            Privacidade
          </a>
          <a className="hub-footer__link" href="/suporte">
            Suporte
          </a>
        </div>
      </footer>
    </div>
  );
}

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
      header: { display: "none" },
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
        <div className="login-brand__logo">
          <Logomark size={36} />
        </div>
        <div className="login-brand__inner">
          <h1 className="login-brand__headline">
            Todos os seus
            <br />
            apps em um
            <br />
            <em>único lugar.</em>
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

export function App() {
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const isAccessDeniedRoute = window.location.pathname.startsWith("/acesso-negado");

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
        <Landing />
      </SignedOut>
      <SignedIn>{isAdminRoute ? <AdminPanel /> : isAccessDeniedRoute ? <AccessDeniedPage /> : <Hub />}</SignedIn>
    </>
  );
}
