import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/errors.js";
import {
  blockEntitlement,
  grantTrialEntitlement,
  upsertEntitlement
} from "./entitlements.service.js";

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
    $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
      return callback(prisma as unknown as PrismaClient);
    },
    customer: {
      findUnique() {
        return { id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0" };
      }
    },
    product: {
      findUnique() {
        return { productKey: "operis" };
      }
    },
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
        action: "entitlement.trial_grant",
        targetType: "entitlement",
        targetId: "entitlement_123"
      }
    });
    expect(entitlement).toMatchObject({ id: "entitlement_123", status: "trial" });
  });
});

describe("upsertEntitlement", () => {
  it("runs validation, mutation, and audit creation in one transaction", async () => {
    const operations: string[] = [];
    const tx = {
      customer: {
        findUnique() {
          operations.push("customer.findUnique");
          return { id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0" };
        }
      },
      product: {
        findUnique() {
          operations.push("product.findUnique");
          return { productKey: "operis" };
        }
      },
      entitlement: {
        findUnique() {
          operations.push("entitlement.findUnique");
          return null;
        },
        upsert() {
          operations.push("entitlement.upsert");
          return {
            id: "entitlement_123",
            customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin"
          };
        }
      },
      auditLog: {
        create() {
          operations.push("auditLog.create");
          throw new Error("audit failed");
        }
      }
    } as unknown as PrismaClient;
    const prisma = {
      $transaction(callback: (transactionPrisma: PrismaClient) => Promise<unknown>) {
        operations.push("transaction.begin");
        return callback(tx);
      }
    } as unknown as PrismaClient;

    await expect(
      upsertEntitlement(prisma, actor, {
        customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        limits: {},
        metadata: {}
      })
    ).rejects.toThrow("audit failed");

    expect(operations).toEqual([
      "transaction.begin",
      "customer.findUnique",
      "product.findUnique",
      "entitlement.findUnique",
      "entitlement.upsert",
      "auditLog.create"
    ]);
  });

  it("rejects missing customers before mutating entitlements", async () => {
    const operations: string[] = [];
    const tx = {
      customer: {
        findUnique() {
          operations.push("customer.findUnique");
          return null;
        }
      },
      product: {
        findUnique() {
          operations.push("product.findUnique");
          return { productKey: "operis" };
        }
      },
      entitlement: {
        upsert() {
          operations.push("entitlement.upsert");
          return {};
        }
      }
    } as unknown as PrismaClient;
    const prisma = {
      $transaction(callback: (transactionPrisma: PrismaClient) => Promise<unknown>) {
        return callback(tx);
      }
    } as unknown as PrismaClient;

    await expect(
      upsertEntitlement(prisma, actor, {
        customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        limits: {},
        metadata: {}
      })
    ).rejects.toEqual(new ApiError(404, "NOT_FOUND", "Customer not found."));

    expect(operations).toEqual(["customer.findUnique"]);
  });

  it("rejects missing products before mutating entitlements", async () => {
    const operations: string[] = [];
    const tx = {
      customer: {
        findUnique() {
          operations.push("customer.findUnique");
          return { id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0" };
        }
      },
      product: {
        findUnique() {
          operations.push("product.findUnique");
          return null;
        }
      },
      entitlement: {
        upsert() {
          operations.push("entitlement.upsert");
          return {};
        }
      }
    } as unknown as PrismaClient;
    const prisma = {
      $transaction(callback: (transactionPrisma: PrismaClient) => Promise<unknown>) {
        return callback(tx);
      }
    } as unknown as PrismaClient;

    await expect(
      upsertEntitlement(prisma, actor, {
        customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        limits: {},
        metadata: {}
      })
    ).rejects.toEqual(new ApiError(404, "NOT_FOUND", "Product not found."));

    expect(operations).toEqual(["customer.findUnique", "product.findUnique"]);
  });
});

describe("blockEntitlement", () => {
  it("uses a block-specific audit action", async () => {
    const { prisma, calls } = prismaWithEntitlementMutation();

    await blockEntitlement(prisma, actor, {
      customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      productKey: "operis",
      reason: "chargeback"
    });

    expect(calls.auditCreate).toMatchObject({
      data: {
        action: "entitlement.block"
      }
    });
  });
});
