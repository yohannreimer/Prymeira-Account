import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../../lib/errors.js";
import { evaluateEntitlementAccess } from "../access/access.service.js";

type Database = PrismaClient | Prisma.TransactionClient;
const membershipInclude = {
  customer: true,
  workspace: { include: { entitlements: true, productMembers: { include: { product: true } } } }
} satisfies Prisma.WorkspaceMemberInclude;
type Membership = Prisma.WorkspaceMemberGetPayload<{ include: typeof membershipInclude }>;

function eligible(membership: Membership | null) {
  if (!membership || membership.status !== "active") return false;
  const seat = membership.workspace.productMembers.find((item) =>
    item.customerId === membership.customerId && item.productKey === "talk");
  return evaluateEntitlementAccess({
    customer: membership.customer,
    workspace: { ...membership.workspace, role: membership.role },
    productSeat: seat ?? null,
    product: seat?.product ?? null,
    entitlement: membership.workspace.entitlements.find((item) => item.productKey === "talk") ?? null,
    now: new Date()
  }).allowed;
}

export async function sellerMembership(prisma: Database, sellerCustomerId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_customerId: { workspaceId, customerId: sellerCustomerId } },
    include: membershipInclude
  });
  return eligible(membership) ? membership : null;
}

export async function requireEligibleSeller(prisma: Database, sellerCustomerId: string, workspaceId: string) {
  const membership = await sellerMembership(prisma, sellerCustomerId, workspaceId);
  if (!membership) throw new ApiError(403, "FORBIDDEN", "Vendedor sem acesso ativo ao Talk neste workspace.");
  return membership;
}

export async function sellerWorkspaces(prisma: Database, sellerCustomerId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { customerId: sellerCustomerId }, include: membershipInclude
  });
  return memberships.filter(eligible).map(({ workspace }) => ({ id: workspace.id, name: workspace.name }));
}

const catalogSchema = z.object({ channels: z.array(z.object({
  id: z.string().uuid(), workspaceId: z.string().uuid(), displayName: z.string(), phoneNumber: z.string().nullable()
})) });

export async function channelCatalog(
  prisma: Database, sellerCustomerId: string, workspaceId: string,
  authorization: string, configuredApiUrl?: string
) {
  await requireEligibleSeller(prisma, sellerCustomerId, workspaceId);
  const product = await prisma.product.findUnique({ where: { productKey: "talk" } });
  if (!product) throw new ApiError(403, "FORBIDDEN", "Talk indisponível.");
  try {
    const base = configuredApiUrl ?? `${new URL(product.appUrl).origin}/api`;
    const url = new URL(`${base.replace(/\/$/, "")}/supervision/admin/channels`);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    url.searchParams.set("workspaceId", workspaceId);
    const response = await fetch(url, {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(8000), redirect: "error"
    });
    if (!response.ok) throw new Error("Talk catalog unavailable");
    const catalog = catalogSchema.parse(await response.json());
    if (catalog.channels.some((channel) => channel.workspaceId !== workspaceId)) {
      throw new Error("Unexpected channel workspace");
    }
    return catalog;
  } catch {
    throw new ApiError(502, "TALK_UNAVAILABLE", "Não foi possível confirmar os canais do Talk. Tente novamente.");
  }
}

export async function mySupervisionGrants(prisma: Database, clerkUserId: string) {
  const customer = await prisma.customer.findUnique({ where: { clerkUserId } });
  if (!customer) return { grants: [] };
  const grants = await prisma.talkSupervisionGrant.findMany({
    where: { supervisorCustomerId: customer.id, status: "active" },
    include: { seller: true }, orderBy: { createdAt: "asc" }
  });
  const visible = await Promise.all(grants.map(async (grant) => {
    if (!await sellerMembership(prisma, grant.sellerCustomerId, grant.workspaceId)) return null;
    return {
      id: grant.id, supervisor_customer_id: grant.supervisorCustomerId,
      seller_customer_id: grant.sellerCustomerId, seller_name: grant.seller.name ?? grant.seller.email,
      seller_email: grant.seller.email, workspace_id: grant.workspaceId, channel_id: grant.channelId
    };
  }));
  return { grants: visible.filter((grant) => grant !== null) };
}

export type GrantInput = {
  supervisorCustomerId: string; sellerCustomerId: string; workspaceId: string; channelId: string;
  channelDisplayName?: string; channelPhoneNumber?: string | null;
};
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function saveGrant(prisma: PrismaClient, actorClerkUserId: string, input: GrantInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (!await tx.customer.findUnique({ where: { id: input.supervisorCustomerId } })) {
        throw new ApiError(404, "NOT_FOUND", "Supervisor não encontrado.");
      }
      await requireEligibleSeller(tx, input.sellerCustomerId, input.workspaceId);
      const where = { supervisorCustomerId_workspaceId_channelId: {
        supervisorCustomerId: input.supervisorCustomerId, workspaceId: input.workspaceId, channelId: input.channelId
      } };
      const before = await tx.talkSupervisionGrant.findUnique({ where });
      if (before && (before.status === "active" || before.sellerCustomerId !== input.sellerCustomerId)) {
        throw new ApiError(409, "CONFLICT", "Este canal já possui um vínculo para este supervisor.");
      }
      const grant = before
        ? await tx.talkSupervisionGrant.update({ where: { id: before.id }, data: { status: "active", revokedAt: null, channelDisplayName: input.channelDisplayName, channelPhoneNumber: input.channelPhoneNumber } })
        : await tx.talkSupervisionGrant.create({ data: input });
      await tx.auditLog.create({ data: {
        actorClerkUserId, action: before ? "talk_supervision.reactivate" : "talk_supervision.create",
        targetType: "talk_supervision", targetId: grant.id,
        ...(before ? { before: snapshot(before) } : {}), after: snapshot(grant)
      } });
      return grant;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      throw new ApiError(409, "CONFLICT", "Vínculo alterado por outra ação. Atualize e tente novamente.");
    }
    throw error;
  }
}

export async function revokeGrant(prisma: PrismaClient, actorClerkUserId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.talkSupervisionGrant.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "NOT_FOUND", "Vínculo não encontrado.");
    if (before.status !== "active") return before;
    const grant = await tx.talkSupervisionGrant.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
    await tx.auditLog.create({ data: {
      actorClerkUserId, action: "talk_supervision.revoke", targetType: "talk_supervision",
      targetId: id, before: snapshot(before), after: snapshot(grant)
    } });
    return grant;
  });
}
