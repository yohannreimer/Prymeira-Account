import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import { ApiError } from "../../lib/errors.js";
import type { AuthVerifier } from "../auth/types.js";

const supervisorId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "33333333-3333-4333-8333-333333333333";
const channelId = "44444444-4444-4444-8444-444444444444";
const grantId = "55555555-5555-4555-8555-555555555555";
const payload = { supervisor_customer_id: supervisorId, seller_customer_id: sellerId, workspace_id: workspaceId, channel_id: channelId };
const headers = { authorization: "Bearer admin", "x-admin-action-token": "confirm" };
const auth: AuthVerifier = { async verifyBearerToken(value) {
  if (!value) throw new ApiError(401, "UNAUTHORIZED", "Bearer required");
  return { clerkUserId: value === "Bearer admin" ? "clerk_admin" : "clerk_supervisor", email: value === "Bearer admin" ? "admin@example.com" : "supervisor@example.com" };
} };
function fixture() {
  const product = { productKey: "talk", status: "active", appUrl: "https://talk.example.com/some-path", marketingUrl: null };
  const entitlement = { workspaceId, productKey: "talk", status: "active", plan: "pro", source: "admin", seatsLimit: 1, endsAt: null as Date | null, trialEndsAt: null as Date | null, currentPeriodEndsAt: null, limits: {} };
  const seat = { customerId: sellerId, workspaceId, productKey: "talk", status: "active", role: "member", product };
  const membership = { customerId: sellerId, workspaceId, status: "active", role: "member", customer: { id: sellerId, name: "Vendedor", email: "seller@example.com" }, workspace: { id: workspaceId, name: "Loja", status: "active", entitlements: [entitlement], productMembers: [seat] } };
  const grant = { id: grantId, supervisorCustomerId: supervisorId, sellerCustomerId: sellerId, workspaceId, channelId, status: "active", revokedAt: null as Date | null, createdAt: new Date(), seller: membership.customer };
  let existing: typeof grant | null = null;
  const db = {
    customer: { findUnique: vi.fn(async (args: { where: { clerkUserId?: string; id?: string } }) => args.where.clerkUserId ? { id: supervisorId } : { id: args.where.id }) },
    workspaceMember: { findUnique: vi.fn(async () => membership), findMany: vi.fn(async () => [membership]) },
    product: { findUnique: vi.fn(async () => product) },
    talkSupervisionGrant: {
      findMany: vi.fn(async (args: { where: { status?: string } }) => args.where.status && existing?.status !== "active" ? [] : existing ? [existing] : []),
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async () => { existing = { ...grant }; return existing; }),
      update: vi.fn(async (args: { data: { status: string; revokedAt: Date | null } }) => { existing = { ...grant, ...args.data }; return existing; })
    },
    auditLog: { create: vi.fn(async () => ({ id: "audit" })) },
    $transaction: async <T>(callback: (tx: PrismaClient) => Promise<T>) => callback(db as unknown as PrismaClient)
  };
  return { db, prisma: db as unknown as PrismaClient, membership, entitlement, seat, product, grant, setExisting: (value: typeof grant | null) => { existing = value; } };
}
beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.ADMIN_ACTION_TOKEN = "confirm";
  process.env.NODE_ENV = "test";
  process.env.DEMO_MODE = "false";
  delete process.env.TALK_API_URL;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ channels: [{ id: channelId, workspaceId, displayName: "Vendas", phoneNumber: "5511999999999" }] }))));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Talk supervision", () => {
  it.each(["/me/talk-supervision", "/admin/talk-supervision/sources", "/admin/talk-supervision/channels", "/admin/talk-supervision/grants"])("requires authentication for %s", async (url) => {
    const app = await buildApp({ prisma: {} as PrismaClient, authVerifier: auth });
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
    await app.close();
  });
  it.each([
    ["GET", `/admin/talk-supervision/sources?seller_customer_id=${sellerId}`],
    ["GET", `/admin/talk-supervision/channels?seller_customer_id=${sellerId}&workspace_id=${workspaceId}`],
    ["GET", `/admin/talk-supervision/grants?supervisor_customer_id=${supervisorId}`],
    ["POST", "/admin/talk-supervision/grants"],
    ["POST", `/admin/talk-supervision/grants/${grantId}/revoke`]
  ] as const)("denies nonadmin %s %s", async (method, url) => {
    const app = await buildApp({ prisma: {} as PrismaClient, authVerifier: auth });
    const response = await app.inject({ method, url, headers: { authorization: "Bearer supervisor" }, ...(method === "POST" ? { payload } : {}) });
    expect(response.statusCode).toBe(403);
    await app.close();
  });
  it.each(["/admin/talk-supervision/grants", `/admin/talk-supervision/grants/${grantId}/revoke`])("requires mutation token for %s", async (url) => {
    const app = await buildApp({ prisma: {} as PrismaClient, authVerifier: auth });
    expect((await app.inject({ method: "POST", url, headers: { authorization: "Bearer admin" }, payload })).statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    await app.close();
  });
  it("returns no supervision grants in demo without querying the database", async () => {
    process.env.DEMO_MODE = "true";
    const app = await buildApp({ prisma: {} as PrismaClient, authVerifier: auth });
    expect((await app.inject({ method: "GET", url: "/me/talk-supervision", headers: { authorization: "Bearer supervisor" } })).json()).toEqual({ grants: [] });
    await app.close();
  });
  it("creates only after catalog validation and records audit without creating own seats", async () => {
    const { prisma, db } = fixture();
    const app = await buildApp({ prisma, authVerifier: auth });
    const response = await app.inject({ method: "POST", url: "/admin/talk-supervision/grants", headers, payload });
    expect(response.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledWith(new URL(`https://talk.example.com/api/supervision/admin/channels?workspaceId=${workspaceId}`), expect.objectContaining({ headers: { Authorization: "Bearer admin" }, redirect: "error", signal: expect.any(AbortSignal) }));
    expect(db.talkSupervisionGrant.create).toHaveBeenCalledWith({ data: { supervisorCustomerId: supervisorId, sellerCustomerId: sellerId, workspaceId, channelId, channelDisplayName: "Vendas", channelPhoneNumber: "5511999999999" } });
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorClerkUserId: "clerk_admin", action: "talk_supervision.create" }) }));
    await app.close();
  });
  it.each(["missing", "wrong workspace", "invalid catalog", "unavailable", "network failure"])("fails closed on %s catalog", async (kind) => {
    const { prisma, db } = fixture();
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (kind === "network failure") throw new Error("network");
      const channels = kind === "missing" ? [] : kind === "invalid catalog" ? [{ id: "invalid" }] : [{ id: channelId, workspaceId: sellerId, displayName: "Vendas", phoneNumber: null }];
      return new Response(JSON.stringify({ channels }), { status: kind === "unavailable" ? 503 : 200 });
    }));
    const app = await buildApp({ prisma, authVerifier: auth });
    const response = await app.inject({ method: "POST", url: "/admin/talk-supervision/grants", headers, payload });
    expect(response.statusCode).toBe(kind === "missing" ? 400 : 502);
    expect(db.talkSupervisionGrant.create).not.toHaveBeenCalled();
    await app.close();
  });
  it.each(["membership", "workspace", "seat", "product", "blocked", "expired", "trial expired", "ends expired", "no entitlement", "no seat"])("omits own grant and denies catalog/create when %s is inactive", async (kind) => {
    const f = fixture(); f.setExisting(f.grant);
    if (kind === "membership") f.membership.status = "inactive";
    if (kind === "workspace") f.membership.workspace.status = "inactive";
    if (kind === "seat") f.seat.status = "inactive";
    if (kind === "product") f.product.status = "inactive";
    if (kind === "blocked" || kind === "expired") f.entitlement.status = kind;
    if (kind === "trial expired") { f.entitlement.status = "trial"; f.entitlement.trialEndsAt = new Date(0); }
    if (kind === "ends expired") f.entitlement.endsAt = new Date(0);
    if (kind === "no entitlement") f.membership.workspace.entitlements = [];
    if (kind === "no seat") f.membership.workspace.productMembers = [];
    const app = await buildApp({ prisma: f.prisma, authVerifier: auth });
    expect((await app.inject({ method: "GET", url: "/me/talk-supervision", headers: { authorization: "Bearer supervisor" } })).json()).toEqual({ grants: [] });
    expect((await app.inject({ method: "GET", url: `/admin/talk-supervision/sources?seller_customer_id=${sellerId}`, headers })).json()).toEqual({ workspaces: [] });
    expect((await app.inject({ method: "POST", url: "/admin/talk-supervision/grants", headers, payload })).statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    await app.close();
  });
  it("resolves own supervisor only from verified identity and returns the contract", async () => {
    const f = fixture(); f.setExisting(f.grant);
    const app = await buildApp({ prisma: f.prisma, authVerifier: auth });
    const response = await app.inject({ method: "GET", url: `/me/talk-supervision?supervisor_customer_id=${sellerId}`, headers: { authorization: "Bearer supervisor" } });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(f.db.customer.findUnique).toHaveBeenCalledWith({ where: { clerkUserId: "clerk_supervisor" } });
    expect(f.db.talkSupervisionGrant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { supervisorCustomerId: supervisorId, status: "active" } }));
    expect(response.json()).toEqual({ grants: [{ id: grantId, ...payload, seller_name: "Vendedor", seller_email: "seller@example.com" }] });
    await app.close();
  });
  it.each(["active", "conflicting seller"])("rejects duplicate %s mappings", async (kind) => {
    const f = fixture(); f.setExisting({ ...f.grant, ...(kind === "conflicting seller" ? { sellerCustomerId: supervisorId, status: "revoked" } : {}) });
    const app = await buildApp({ prisma: f.prisma, authVerifier: auth });
    expect((await app.inject({ method: "POST", url: "/admin/talk-supervision/grants", headers, payload })).statusCode).toBe(409);
    expect(f.db.auditLog.create).not.toHaveBeenCalled();
    await app.close();
  });
  it("revokes atomically, omits next read and audits reactivation", async () => {
    const f = fixture(); f.setExisting(f.grant);
    const app = await buildApp({ prisma: f.prisma, authVerifier: auth });
    expect((await app.inject({ method: "POST", url: `/admin/talk-supervision/grants/${grantId}/revoke`, headers })).statusCode).toBe(200);
    expect(f.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "talk_supervision.revoke", before: expect.objectContaining({ status: "active" }), after: expect.objectContaining({ status: "revoked" }) }) }));
    expect((await app.inject({ method: "GET", url: "/me/talk-supervision", headers: { authorization: "Bearer supervisor" } })).json()).toEqual({ grants: [] });
    expect((await app.inject({ method: "POST", url: "/admin/talk-supervision/grants", headers, payload })).statusCode).toBe(200);
    expect(f.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "talk_supervision.reactivate" }) }));
    await app.close();
  });
  it("lists only eligible workspaces and proxies their actual channels", async () => {
    const f = fixture(); const app = await buildApp({ prisma: f.prisma, authVerifier: auth });
    expect((await app.inject({ method: "GET", url: `/admin/talk-supervision/sources?seller_customer_id=${sellerId}`, headers })).json()).toEqual({ workspaces: [{ id: workspaceId, name: "Loja" }] });
    expect((await app.inject({ method: "GET", url: `/admin/talk-supervision/channels?seller_customer_id=${sellerId}&workspace_id=${workspaceId}`, headers })).json()).toMatchObject({ channels: [{ id: channelId, workspaceId }] });
    await app.close();
  });
});
