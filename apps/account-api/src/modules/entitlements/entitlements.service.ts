import type { Prisma, PrismaClient } from "@prisma/client";
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
};

export async function upsertEntitlement(
  prisma: PrismaClient,
  actor: AuditActor,
  input: UpsertEntitlementInput
) {
  const where = {
    customerId_productKey: { customerId: input.customerId, productKey: input.productKey }
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
      action: "entitlement.upsert",
      targetType: "entitlement",
      targetId: entitlement.id,
      ...(before ? { before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue } : {}),
      after: JSON.parse(JSON.stringify(entitlement)) as Prisma.InputJsonValue
    }
  });

  return entitlement;
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
    currentPeriodEndsAt: null
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
    metadata: { trial_days: input.trialDays }
  });
}
