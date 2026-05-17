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
import { accountApiUrl, fetchAdminSession, fetchMyProducts, resolveProductUrl } from "./api";
import { AdminPanel } from "./AdminPanel";
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
  if (product.allowed && product.status === "trial") return "Trial";
  if (product.allowed) return product.plan ? `Ativo - ${product.plan}` : "Ativo";
  if (product.reason === "trial_expired") return "Trial expirado";
  if (product.status === "blocked") return "Bloqueado";
  return "Bloqueado";
}

function actionLabel(product: AccountProductAccess) {
  if (product.allowed) return "Abrir";
  if (product.reason === "trial_expired") return "Renovar";
  return product.marketing_url || product.upgrade_url ? "Conhecer" : "Indisponivel";
}

function productGroups(products: AccountProductAccess[]): ProductGroup[] {
  const active = products.filter((product) => product.allowed);
  const trial = products.filter((product) => !product.allowed && product.status === "trial");
  const locked = products.filter((product) => !product.allowed && product.status !== "trial");
  return [
    { title: "Produtos ativos", eyebrow: "Prontos para entrar", products: active },
    { title: "Disponiveis para testar", eyebrow: "Proximas liberacoes", products: trial },
    { title: "Bloqueados", eyebrow: "Assinatura ou liberacao pendente", products: locked },
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
            {product.allowed ? (
              <ArrowRight size={12} aria-hidden="true" />
            ) : (
              <Lock size={11} aria-hidden="true" />
            )}
          </a>
        )}
        {product.workspace_role && (
          <span className="pcard__meta">{product.workspace_role}</span>
        )}
      </div>
    </article>
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
        return fetchMyProducts(token);
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
  }, [getToken]);

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
  const plan = (data?.workspace as Record<string, unknown>)?.["plan"] as string | null ?? data?.workspace?.type ?? null;
  const displayName =
    user?.firstName ?? user?.fullName ?? data?.customer?.email ?? "Conta";
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
              Workspace · {workspaceName}
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
              <div className="metric-card__lbl">Trials</div>
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
        <div className="login-brand__inner">
          <div className="login-brand__logo">
            <Logomark size={30} />
            <span className="login-brand__logotype">Prymeira</span>
          </div>
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
      <SignedIn>{isAdminRoute ? <AdminPanel /> : <Hub />}</SignedIn>
    </>
  );
}
