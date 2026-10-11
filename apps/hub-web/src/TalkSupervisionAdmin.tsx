import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  createTalkSupervisionGrant, fetchAdminCustomers, fetchTalkSupervisionChannels,
  fetchTalkSupervisionGrants, fetchTalkSupervisionSources, revokeTalkSupervisionGrant
} from "./api";
import type { AdminCustomerListItem, AdminTalkGrant, TalkChannel } from "./types";

export function TalkSupervisionAdmin({ supervisor, actionToken }: {
  supervisor: Pick<AdminCustomerListItem, "id" | "name" | "email">; actionToken: string;
}) {
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [sellers, setSellers] = useState<AdminCustomerListItem[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [channels, setChannels] = useState<TalkChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [grants, setGrants] = useState<AdminTalkGrant[]>([]);
  const [pending, setPending] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const message = (value: unknown) => value instanceof Error ? value.message : String(value);
  async function token() {
    const value = await getToken();
    if (!value) throw new Error("Sessão sem token.");
    return value;
  }

  useEffect(() => {
    let active = true;
    setLoadingGrants(true);
    token().then((value) => fetchTalkSupervisionGrants(value, supervisor.id))
      .then((response) => { if (active) setGrants(response.grants); })
      .catch((value) => { if (active) setError(message(value)); })
      .finally(() => { if (active) setLoadingGrants(false); });
    return () => { active = false; };
  }, [supervisor.id, getToken, revision]);

  useEffect(() => {
    let active = true;
    setWorkspaces([]); setWorkspaceId(""); setChannels([]); setChannelId("");
    if (!sellerId) { setLoadingSources(false); return; }
    setLoadingSources(true); setError(null);
    token().then((value) => fetchTalkSupervisionSources(value, sellerId))
      .then((response) => { if (active) setWorkspaces(response.workspaces); })
      .catch((value) => { if (active) setError(message(value)); })
      .finally(() => { if (active) setLoadingSources(false); });
    return () => { active = false; };
  }, [sellerId, getToken]);

  useEffect(() => {
    let active = true;
    setChannels([]); setChannelId("");
    if (!workspaceId || !sellerId) { setLoadingChannels(false); return; }
    setLoadingChannels(true); setError(null);
    token().then((value) => fetchTalkSupervisionChannels(value, sellerId, workspaceId))
      .then((response) => { if (active) setChannels(response.channels); })
      .catch((value) => { if (active) setError(message(value)); })
      .finally(() => { if (active) setLoadingChannels(false); });
    return () => { active = false; };
  }, [workspaceId, sellerId, getToken]);

  async function searchSellers(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setNotice(null);
    setSellerId(""); setSellers([]);
    try { setSellers((await fetchAdminCustomers(await token(), search)).customers); }
    catch (value) { setError(message(value)); }
    finally { setPending(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null); setNotice(null);
    try {
      await createTalkSupervisionGrant(await token(), actionToken, {
        supervisor_customer_id: supervisor.id, seller_customer_id: sellerId, workspace_id: workspaceId, channel_id: channelId
      });
      setRevision((value) => value + 1); setNotice("Supervisão liberada.");
    } catch (value) { setError(message(value)); }
    finally { setPending(false); }
  }
  async function revoke(id: string) {
    setPending(true); setError(null); setNotice(null);
    try {
      await revokeTalkSupervisionGrant(await token(), actionToken, id);
      setRevision((value) => value + 1); setNotice("Supervisão revogada.");
    } catch (value) { setError(message(value)); }
    finally { setPending(false); }
  }
  return (
    <section aria-label="Supervisão do Talk" className="talk-supervision-admin">
      <div className="admin-sec-title">Supervisão do Talk</div>
      <p>Supervisor: <strong>{supervisor.name ?? supervisor.email}</strong> · {supervisor.email}</p>
      <p>Acesso somente à leitura dos canais vinculados, sem exigir um número ou plano próprio.</p>
      {error && <div className="admin-notice admin-notice--error" role="alert">{error}</div>}
      {notice && <div className="admin-notice admin-notice--success" role="status">{notice}</div>}
      <form onSubmit={searchSellers}>
        <div className="admin-field">
          <label htmlFor="talk-seller-search">Buscar vendedor por nome ou e-mail</label>
          <input id="talk-seller-search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={pending} required />
        </div>
        <button type="submit" className="admin-action-btn admin-action-btn--black" disabled={pending}>Buscar vendedor</button>
      </form>
      <form onSubmit={create}>
        <div className="admin-field">
          <label htmlFor="talk-seller">Vendedor existente</label>
          <select id="talk-seller" value={sellerId} onChange={(event) => setSellerId(event.target.value)} disabled={pending} required>
            <option value="">Selecione o vendedor</option>
            {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name ?? seller.email} · {seller.email}</option>)}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="talk-workspace">Workspace com Talk ativo</label>
          <select id="talk-workspace" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} disabled={pending || loadingSources || !sellerId} required>
            <option value="">{loadingSources ? "Carregando workspaces…" : "Selecione o workspace"}</option>
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          {sellerId && !loadingSources && workspaces.length === 0 && <p>Nenhum workspace elegível para este vendedor.</p>}
        </div>
        <div className="admin-field">
          <label htmlFor="talk-channel">Canal do vendedor</label>
          <select id="talk-channel" value={channelId} onChange={(event) => setChannelId(event.target.value)} disabled={pending || loadingChannels || !workspaceId} required>
            <option value="">{loadingChannels ? "Carregando canais…" : "Selecione o canal"}</option>
            {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.displayName}{channel.phoneNumber ? ` · ${channel.phoneNumber}` : ""}</option>)}
          </select>
          {workspaceId && !loadingChannels && channels.length === 0 && <p>Nenhum canal disponível neste workspace.</p>}
        </div>
        <button type="submit" className="admin-action-btn admin-action-btn--gold" disabled={pending || loadingSources || loadingChannels || !sellerId || !workspaceId || !channelId}>Liberar supervisão</button>
      </form>
      <div className="admin-sec-title">Vínculos do supervisor</div>
      {loadingGrants ? <p>Carregando vínculos…</p> : grants.length === 0 ? <p>Nenhum vínculo cadastrado.</p> : (
        <div className="talk-supervision-grants">
          {grants.map((grant) => <div key={grant.id} className="talk-supervision-grant">
            <strong>{grant.seller.name ?? grant.seller.email}</strong><span>{grant.seller.email} · {grant.workspace.name}</span>
            <small>Canal: {grant.channelDisplayName ?? "Canal sem nome"}{grant.channelPhoneNumber ? ` · ${grant.channelPhoneNumber}` : ""}</small>
            <span>{grant.status === "active" ? "Ativo" : "Revogado"}</span>
            {grant.status === "active" && <button className="admin-action-btn admin-action-btn--danger" type="button" disabled={pending} onClick={() => void revoke(grant.id)}>Revogar supervisão</button>}
          </div>)}
        </div>
      )}
    </section>
  );
}
