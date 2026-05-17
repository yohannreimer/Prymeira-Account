import { useEffect, useMemo, useState } from "react";
import {
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useUser
} from "@clerk/clerk-react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { accountApiUrl, fetchMyProducts, resolveProductUrl } from "./api";
import { readProductPresentation } from "./products";
import type { AccountProductAccess, AccountProductsResponse } from "./types";
import logo from "./assets/prymeira-horizontal.svg";
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
    { title: "Bloqueados", eyebrow: "Assinatura ou liberacao pendente", products: locked }
  ].filter((group) => group.products.length > 0);
}

function LoadingProducts() {
  return (
    <div className="state-card">
      <RefreshCw className="state-card__spin" size={18} aria-hidden="true" />
      <span>Carregando seu hub...</span>
    </div>
  );
}

function ProductCard({ product }: { product: AccountProductAccess }) {
  const presentation = readProductPresentation(product.product_key);
  const Icon = presentation.icon;
  const targetUrl = product.allowed
    ? resolveProductUrl(product.product_key, product.app_url)
    : product.upgrade_url ?? product.marketing_url ?? null;
  const disabled = !targetUrl || targetUrl === "#";

  return (
    <article className={`product-card ${product.allowed ? "product-card--active" : "product-card--locked"}`}>
      <div className="product-card__mark" style={{ "--product-accent": presentation.accent } as React.CSSProperties}>
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{presentation.category}</span>
          <span>{statusLabel(product)}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description ?? "Produto Prymeira Digital conectado a sua conta central."}</p>
      </div>
      <div className="product-card__footer">
        <span>{product.workspace_role ? `Workspace: ${product.workspace_role}` : product.reason}</span>
        {disabled ? (
          <button className="product-card__action" type="button" disabled>
            {actionLabel(product)}
          </button>
        ) : (
          <a className="product-card__action" href={targetUrl}>
            {actionLabel(product)}
            {product.allowed ? <ArrowRight size={14} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
          </a>
        )}
      </div>
    </article>
  );
}

function Hub() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
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
        return fetchMyProducts(token);
      })
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((currentError: unknown) => {
        if (!active) return;
        setError(currentError instanceof Error ? currentError.message : String(currentError));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getToken]);

  const groups = useMemo(() => productGroups(data?.products ?? []), [data]);
  const activeCount = data?.products.filter((product) => product.allowed).length ?? 0;
  const lockedCount = data?.products.filter((product) => !product.allowed).length ?? 0;
  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? data?.customer?.email ?? "Conta Prymeira";
  const workspaceName = data?.workspace?.name ?? "Workspace em preparacao";

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Prymeira App">
          <img src={logo} alt="Prymeira" />
        </a>
        <div className="topbar__account">
          <div>
            <span>{displayName}</span>
            <strong>{workspaceName}</strong>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="hub-layout">
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow">app.prymeiradigital.com.br</p>
            <h1>Prymeira App</h1>
            <p>
              Um hub central para entrar nos produtos liberados, acompanhar bloqueios e manter cada workspace no seu proprio territorio.
            </p>
          </div>
          <div className="hero__panel" aria-label="Resumo da conta">
            <div className="hero__metric">
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{activeCount}</span>
              <small>ativos</small>
            </div>
            <div className="hero__metric">
              <Lock size={17} aria-hidden="true" />
              <span>{lockedCount}</span>
              <small>bloqueados</small>
            </div>
            <div className="hero__metric hero__metric--wide">
              <Building2 size={17} aria-hidden="true" />
              <span>{workspaceName}</span>
              <small>{data?.workspace?.type ?? "workspace"}</small>
            </div>
          </div>
        </section>

        {isLoading ? <LoadingProducts /> : null}

        {error ? (
          <div className="state-card state-card--error">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>Acesso nao carregado</strong>
              <span>{error}</span>
              <small>Account API: {accountApiUrl}</small>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && groups.length === 0 ? (
          <div className="state-card">
            <Sparkles size={18} aria-hidden="true" />
            <span>Nenhum produto cadastrado para exibir.</span>
          </div>
        ) : null}

        {groups.map((group) => (
          <section className="product-section" key={group.title}>
            <div className="section-heading">
              <span>{group.eyebrow}</span>
              <h2>{group.title}</h2>
            </div>
            <div className="product-grid">
              {group.products.map((product) => (
                <ProductCard key={product.product_key} product={product} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="footer">
        <span>Clerk autentica. Account autoriza. Cada app obedece.</span>
        <button type="button" onClick={() => signOut({ redirectUrl: "/" })}>Sair</button>
      </footer>
    </div>
  );
}

function Landing() {
  return (
    <div className="signed-out">
      <div className="signed-out__panel">
        <img src={logo} alt="Prymeira" />
        <p className="eyebrow">Ecossistema modular</p>
        <h1>Entre no seu hub Prymeira.</h1>
        <p>Acesse produtos, trials e workspaces com uma conta central.</p>
        <SignInButton mode="modal">
          <button type="button">Entrar</button>
        </SignInButton>
      </div>
    </div>
  );
}

export function App() {
  return (
    <>
      <ClerkLoading>
        <div className="signed-out">
          <div className="signed-out__panel">
            <img src={logo} alt="Prymeira" />
            <p className="eyebrow">Carregando sessao</p>
            <h1>Prymeira App</h1>
            <p>Preparando sua conta central.</p>
          </div>
        </div>
      </ClerkLoading>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <Hub />
      </SignedIn>
    </>
  );
}
