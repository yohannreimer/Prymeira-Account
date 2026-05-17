import { FormEvent, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  Clock3,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  blockAdminEntitlement,
  fetchAdminCustomer,
  fetchAdminCustomers,
  fetchAdminSession,
  grantAdminTrial,
  upsertAdminEntitlement,
} from "./api";
import { productKeys } from "./products";
import logomark from "./assets/prymeira-selo.png";
import logotype from "./assets/prymeira-logo.png";
import type {
  AdminAuditLog,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminEntitlement,
  AdminWorkspace,
} from "./types";

type Notice = {
  tone: "success" | "error";
  message: string;
};

const statusOptions = ["active", "trial", "internal", "blocked", "expired", "cancelled"];
const sourceOptions = ["admin", "manual", "internal", "trial", "payment", "migration"];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function selectedWorkspace(customer: AdminCustomerDetail | null, selectedWorkspaceId: string) {
  return (
    customer?.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    customer?.workspaces[0] ??
    null
  );
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

export function AdminPanel() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [actionToken, setActionToken] = useState("");
  const [productKey, setProductKey] = useState(productKeys[0] ?? "operis");
  const [status, setStatus] = useState("active");
  const [source, setSource] = useState("admin");
  const [plan, setPlan] = useState("internal");
  const [seatsLimit, setSeatsLimit] = useState(1);
  const [trialDays, setTrialDays] = useState(14);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function withToken<T>(callback: (token: string) => Promise<T>) {
    const token = await getToken();
    if (!token) throw new Error("Sessao Clerk sem token.");
    return callback(token);
  }

  async function loadCustomers(nextSearch = search) {
    setIsLoading(true);
    setNotice(null);
    try {
      const response = await withToken((token) => fetchAdminCustomers(token, nextSearch));
      setCustomers(response.customers);
      if (!selectedCustomerId && response.customers[0]) {
        setSelectedCustomerId(response.customers[0].id);
      }
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCustomer(customerId: string) {
    setIsLoading(true);
    setNotice(null);
    try {
      const response = await withToken((token) => fetchAdminCustomer(token, customerId));
      setCustomer(response.customer);
      setAuditLogs(response.audit_logs);
      setSelectedWorkspaceId(response.customer?.workspaces[0]?.id ?? "");
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setIsCheckingAdmin(true);

    withToken(fetchAdminSession)
      .then(() => {
        if (!active) return;
        setIsAdmin(true);
        return loadCustomers("");
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
      })
      .finally(() => {
        if (!active) return;
        setIsCheckingAdmin(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => {
    if (selectedCustomerId) {
      void loadCustomer(selectedCustomerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  const workspace = useMemo(
    () => selectedWorkspace(customer, selectedWorkspaceId),
    [customer, selectedWorkspaceId],
  );
  const displayName =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Admin";

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadCustomers(search);
  }

  async function submitEntitlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;

    setIsLoading(true);
    setNotice(null);
    try {
      await withToken((token) =>
        upsertAdminEntitlement(token, actionToken, {
          workspace_id: workspace.id,
          product_key: productKey,
          status,
          source,
          plan,
          seats_limit: seatsLimit,
          limits: {},
          metadata: {},
        }),
      );
      setNotice({ tone: "success", message: "Permissao atualizada." });
      if (selectedCustomerId) await loadCustomer(selectedCustomerId);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;

    setIsLoading(true);
    setNotice(null);
    try {
      await withToken((token) =>
        grantAdminTrial(token, actionToken, {
          workspace_id: workspace.id,
          product_key: productKey,
          plan: "trial",
          trial_days: trialDays,
        }),
      );
      setNotice({ tone: "success", message: "Trial liberado." });
      if (selectedCustomerId) await loadCustomer(selectedCustomerId);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function blockProduct(entitlement: AdminEntitlement) {
    setIsLoading(true);
    setNotice(null);
    try {
      await withToken((token) =>
        blockAdminEntitlement(token, actionToken, {
          workspace_id: entitlement.workspaceId,
          product_key: entitlement.productKey,
          reason: "manual_block",
        }),
      );
      setNotice({ tone: "success", message: `${entitlement.productKey} bloqueado.` });
      if (selectedCustomerId) await loadCustomer(selectedCustomerId);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  const adminInitials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const customerInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  if (isCheckingAdmin) {
    return (
      <div className="page-loading">
        <div className="page-loading__inner">
          <Logomark size={48} />
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
          <a href="/" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>
            ← Voltar ao Hub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar__logo">
          <img
            src={logotype}
            alt="Prymeira"
            height={22}
            style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
          />
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
            <h1 className="admin-hero__title">
              Gestão de <em>clientes</em>
            </h1>
          </div>
          <div className="admin-hero__stats">
            <div className="admin-stat">
              <div className="admin-stat__val">{customers.length}</div>
              <div className="admin-stat__lbl">Clientes</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__val">{workspace?.entitlements.length ?? 0}</div>
              <div className="admin-stat__lbl">Permissões</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__val">{auditLogs.length}</div>
              <div className="admin-stat__lbl">Logs</div>
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
                <Search
                  size={13}
                  style={{ color: "var(--muted)", flexShrink: 0 }}
                  aria-hidden="true"
                />
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
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
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
                              onClick={() => void blockProduct(ent)}
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

              {/* Members */}
              {workspace && workspace.members.length > 0 && (
                <div>
                  <div className="admin-sec-title">Membros do workspace</div>
                  <div className="admin-log">
                    {workspace.members.map((member) => (
                      <div
                        key={member.id ?? `${member.customerId}-${member.role}`}
                        className="admin-log-item"
                      >
                        <span className="admin-log-dot admin-log-dot--green" />
                        <span className="admin-log-text">
                          <strong>
                            {member.customer?.name ?? member.customer?.email ?? member.customerId}
                          </strong>{" "}
                          — {member.role}
                          {member.status ? ` (${member.status})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscriptions */}
              {customer.subscriptions.length > 0 && (
                <div>
                  <div className="admin-sec-title">Assinaturas</div>
                  <div className="admin-log">
                    {customer.subscriptions.map((sub) => (
                      <div key={sub.id} className="admin-log-item">
                        <span className="admin-log-dot admin-log-dot--gold" />
                        <span className="admin-log-text">
                          <strong>{sub.plan}</strong> — {sub.status}
                          {sub.gateway ? ` via ${sub.gateway}` : ""}
                        </span>
                        <span className="admin-log-time">
                          {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit log */}
              {auditLogs.length > 0 && (
                <div>
                  <div className="admin-sec-title">Histórico recente</div>
                  <div className="admin-log">
                    {auditLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="admin-log-item">
                        <span
                          className={`admin-log-dot admin-log-dot--${
                            log.action?.includes("block") || log.action?.includes("cancel")
                              ? "red"
                              : log.action?.includes("trial")
                                ? "gold"
                                : "green"
                          }`}
                        />
                        <span className="admin-log-text">
                          <strong>{log.targetType}</strong> — {log.action}
                        </span>
                        <span className="admin-log-time">{formatDate(log.createdAt)}</span>
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

          {/* Action token */}
          <div className="admin-field">
            <label htmlFor="admin-token">Token admin</label>
            <input
              id="admin-token"
              type="password"
              value={actionToken}
              onChange={(e) => setActionToken(e.target.value)}
              placeholder="Obrigatório se configurado"
            />
          </div>

          {/* Entitlement form */}
          <form
            onSubmit={submitEntitlement}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div className="admin-action-group-lbl">Permissão</div>
            <div className="admin-field">
              <label htmlFor="admin-product">Produto</label>
              <select
                id="admin-product"
                value={productKey}
                onChange={(e) => setProductKey(e.target.value)}
              >
                {productKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="admin-status">Status</label>
              <select
                id="admin-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="admin-source">Source</label>
              <select
                id="admin-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="admin-plan">Plano</label>
              <input
                id="admin-plan"
                type="text"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-seats">Seats</label>
              <input
                id="admin-seats"
                type="number"
                min={1}
                max={1000}
                value={seatsLimit}
                onChange={(e) => setSeatsLimit(Number(e.target.value))}
              />
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
          <form
            onSubmit={submitTrial}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
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
}
