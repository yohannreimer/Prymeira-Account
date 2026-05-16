import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import { addDays } from "../../lib/time.js";

type AuditActor = {
  clerkUserId: string;
};

type UpsertEntitlementInput = {
  customerId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
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
  const { workspaceId } = await resolveEntitlementTargets(prisma, input);

  const where = {
    workspaceId_productKey: { workspaceId, productKey: input.productKey }
  };
  const before = await prisma.entitlement.findUnique({ where });
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
      status: input.status,
      plan: input.plan,
      source: input.source,
      ...nullableDates,
      limits: input.limits,
      metadata: input.metadata
    },
    create: {
      workspaceId,
      customerId: input.customerId,
      productKey: input.productKey,
      status: input.status,
      plan: input.plan,
      source: input.source,
      ...nullableDates,
      limits: input.limits,
      metadata: input.metadata
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
  input: Pick<UpsertEntitlementInput, "customerId" | "productKey">
) {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true }
  });

  if (!customer) {
    throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  }

  const product = await prisma.product.findUnique({
    where: { productKey: input.productKey },
    select: { productKey: true }
  });

  if (!product) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  const workspaceMembership = await prisma.workspaceMember.findFirst({
    where: {
      customerId: input.customerId,
      status: "active",
      workspace: { status: "active" }
    },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true }
  });

  if (!workspaceMembership) {
    throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
  }

  return { workspaceId: workspaceMembership.workspaceId };
}

export async function blockEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: { customerId: string; productKey: string; reason: string }
) {
  return upsertEntitlement(prisma, actor, {
    customerId: input.customerId,
    productKey: input.productKey,
    status: "blocked",
    plan: "blocked",
    source: "admin",
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
  input: { customerId: string; productKey: string; plan: string; trialDays: number; now?: Date }
) {
  const now = input.now ?? new Date();

  return upsertEntitlement(prisma, actor, {
    customerId: input.customerId,
    productKey: input.productKey,
    status: "trial",
    plan: input.plan,
    source: "trial",
    trialEndsAt: addDays(now, input.trialDays),
    endsAt: null,
    currentPeriodEndsAt: null,
    limits: {},
    metadata: { trial_days: input.trialDays },
    auditAction: "entitlement.trial_grant"
  });
}
