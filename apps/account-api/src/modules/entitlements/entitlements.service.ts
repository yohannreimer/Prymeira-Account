import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import { addDays } from "../../lib/time.js";

type AuditActor = {
  clerkUserId: string;
};

type UpsertEntitlementInput = {
  workspaceId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit?: number;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date | null;
  limits: Prisma.InputJsonValue;
  metadata: Prisma.InputJsonValue;
  auditAction?: string;
};

type EntitlementPrisma = PrismaClient | Prisma.TransactionClient;

export async function upsertEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: UpsertEntitlementInput
) {
  return prisma.$transaction((tx) => upsertEntitlementInTransaction(tx, actor, input));
}

async function upsertEntitlementInTransaction(
  prisma: EntitlementPrisma,
  actor: AuditActor,
  input: UpsertEntitlementInput
) {
  const { workspace } = await resolveEntitlementTargets(prisma, input);

  const where = {
    workspaceId_productKey: { workspaceId: input.workspaceId, productKey: input.productKey }
  };
  const before = await prisma.entitlement.findUnique({ where });
  const createSeatsLimit = input.seatsLimit ?? 1;
  const seatsLimitUpdate = input.seatsLimit !== undefined ? { seatsLimit: input.seatsLimit } : {};
  const nullableDates = {
    ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    ...(input.trialEndsAt !== undefined ? { trialEndsAt: input.trialEndsAt } : {}),
    ...(input.currentPeriodEndsAt !== undefined
      ? { currentPeriodEndsAt: input.currentPeriodEndsAt }
      : {})
  };

  const entitlement = await prisma.entitlement.upsert({
    where,
    update: {
      customerId: null,
      status: input.status,
      plan: input.plan,
      source: input.source,
      ...seatsLimitUpdate,
      ...nullableDates,
      limits: input.limits,
      metadata: input.metadata
    },
    create: {
      workspaceId: input.workspaceId,
      customerId: null,
      productKey: input.productKey,
      status: input.status,
      plan: input.plan,
      source: input.source,
      seatsLimit: createSeatsLimit,
      ...nullableDates,
      limits: input.limits,
      metadata: input.metadata
    }
  });

  await prisma.workspaceProductMember.upsert({
    where: {
      workspaceId_customerId_productKey: {
        workspaceId: input.workspaceId,
        customerId: workspace.ownerCustomerId,
        productKey: input.productKey
      }
    },
    update: { role: "owner", status: "active" },
    create: {
      workspaceId: input.workspaceId,
      customerId: workspace.ownerCustomerId,
      productKey: input.productKey,
      role: "owner",
      status: "active"
    }
  });

  await prisma.auditLog.create({
    data: {
      actorClerkUserId: actor.clerkUserId,
      action: input.auditAction ?? "entitlement.upsert",
      targetType: "entitlement",
      targetId: entitlement.id,
      ...(before ? { before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue } : {}),
      after: JSON.parse(JSON.stringify(entitlement)) as Prisma.InputJsonValue
    }
  });

  return entitlement;
}

async function resolveEntitlementTargets(
  prisma: EntitlementPrisma,
  input: Pick<UpsertEntitlementInput, "workspaceId" | "productKey">
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { ownerCustomerId: true }
  });

  if (!workspace) {
    throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
  }

  const product = await prisma.product.findUnique({
    where: { productKey: input.productKey },
    select: { productKey: true }
  });

  if (!product) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  return { workspace };
}

export async function blockEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: { workspaceId: string; productKey: string; reason: string }
) {
  return upsertEntitlement(prisma, actor, {
    workspaceId: input.workspaceId,
    productKey: input.productKey,
    status: "blocked",
    plan: "blocked",
    source: "admin",
    seatsLimit: 1,
    limits: {},
    metadata: { reason: input.reason },
    endsAt: null,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    auditAction: "entitlement.block"
  });
}

export async function grantTrialEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: { workspaceId: string; productKey: string; plan: string; trialDays: number; now?: Date }
) {
  const now = input.now ?? new Date();

  return upsertEntitlement(prisma, actor, {
    workspaceId: input.workspaceId,
    productKey: input.productKey,
    status: "trial",
    plan: input.plan,
    source: "trial",
    seatsLimit: 1,
    trialEndsAt: addDays(now, input.trialDays),
    endsAt: null,
    currentPeriodEndsAt: null,
    limits: {},
    metadata: { trial_days: input.trialDays },
    auditAction: "entitlement.trial_grant"
  });
}
