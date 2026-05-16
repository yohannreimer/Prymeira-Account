import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { grantTrialEntitlement } from "./entitlements.service.js";

const actor = {
  clerkUserId: "user_admin"
};

function prismaWithEntitlementMutation() {
  const calls: {
    findUnique?: unknown;
    upsert?: unknown;
    auditCreate?: unknown;
  } = {};

  const prisma = {
    entitlement: {
      findUnique(args: unknown) {
        calls.findUnique = args;
        return null;
      },
      upsert(args: unknown) {
        calls.upsert = args;
        return {
          id: "entitlement_123",
          customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
          productKey: "operis",
          status: "trial",
          plan: "trial",
          source: "trial",
          trialEndsAt: new Date("2026-05-30T12:00:00.000Z")
        };
      }
    },
    auditLog: {
      create(args: unknown) {
        calls.auditCreate = args;
        return { id: "audit_123" };
      }
    }
  } as unknown as PrismaClient;

  return { prisma, calls };
}

describe("grantTrialEntitlement", () => {
  it("grants a trial entitlement with computed trial end and audit log", async () => {
    const { prisma, calls } = prismaWithEntitlementMutation();
    const customerId = "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0";
    const now = new Date("2026-05-16T12:00:00.000Z");

    const entitlement = await grantTrialEntitlement(prisma, actor, {
      customerId,
      productKey: "operis",
      plan: "trial",
      trialDays: 14,
      now
    });

    expect(calls.upsert).toMatchObject({
      where: { customerId_productKey: { customerId, productKey: "operis" } },
      update: {
        status: "trial",
        plan: "trial",
        source: "trial",
        trialEndsAt: new Date("2026-05-30T12:00:00.000Z"),
        endsAt: null,
        currentPeriodEndsAt: null,
        limits: {},
        metadata: { trial_days: 14 }
      }
    });
    expect(calls.auditCreate).toMatchObject({
      data: {
        actorClerkUserId: "user_admin",
        action: "entitlement.upsert",
        targetType: "entitlement",
        targetId: "entitlement_123"
      }
    });
    expect(entitlement).toMatchObject({ id: "entitlement_123", status: "trial" });
  });
});
