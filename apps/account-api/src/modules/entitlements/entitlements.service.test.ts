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

const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
const ownerCustomerId = "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0";

function prismaWithEntitlementMutation() {
  const calls: {
    entitlementFindUnique?: unknown;
    entitlementUpsert?: unknown;
    auditCreate?: unknown;
    workspaceFindUnique?: unknown;
    productFindUnique?: unknown;
    workspaceProductMemberUpsert?: unknown;
  } = {};

  const prisma = {
    $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
      return callback(prisma as unknown as PrismaClient);
    },
    workspace: {
      findUnique(args: unknown) {
        calls.workspaceFindUnique = args;
        return { id: workspaceId, ownerCustomerId };
      }
    },
    product: {
      findUnique(args: unknown) {
        calls.productFindUnique = args;
        return { productKey: "operis" };
      }
    },
    entitlement: {
      findUnique(args: unknown) {
        calls.entitlementFindUnique = args;
        return null;
      },
      upsert(args: unknown) {
        calls.entitlementUpsert = args;
        return {
          id: "entitlement_123",
          workspaceId,
          productKey: "operis",
          status: "trial",
          plan: "trial",
          source: "trial",
          seatsLimit: 1,
          trialEndsAt: new Date("2026-05-30T12:00:00.000Z")
        };
      }
    },
    workspaceProductMember: {
      upsert(args: unknown) {
        calls.workspaceProductMemberUpsert = args;
        return { id: "seat_123" };
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
  it("grants a trial entitlement to a workspace with computed trial end, owner seat, and audit log", async () => {
    const { prisma, calls } = prismaWithEntitlementMutation();
    const now = new Date("2026-05-16T12:00:00.000Z");

    const entitlement = await grantTrialEntitlement(prisma, actor, {
      workspaceId,
      productKey: "operis",
      plan: "trial",
      trialDays: 14,
      now
    });

    expect(calls.workspaceFindUnique).toMatchObject({
      where: { id: workspaceId },
      select: { ownerCustomerId: true }
    });
    expect(calls.productFindUnique).toMatchObject({
      where: { productKey: "operis" },
      select: { productKey: true }
    });
    expect(calls.entitlementUpsert).toMatchObject({
      where: {
        workspaceId_productKey: {
          workspaceId,
          productKey: "operis"
        }
      },
      update: {
        status: "trial",
        plan: "trial",
        source: "trial",
        seatsLimit: 1,
        trialEndsAt: new Date("2026-05-30T12:00:00.000Z"),
        endsAt: null,
        currentPeriodEndsAt: null,
        limits: {},
        metadata: { trial_days: 14 }
      },
      create: {
        workspaceId,
        productKey: "operis",
        seatsLimit: 1
      }
    });
    expect(calls.workspaceProductMemberUpsert).toMatchObject({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId,
          customerId: ownerCustomerId,
          productKey: "operis"
        }
      },
      update: { role: "owner", status: "active" },
      create: {
        workspaceId,
        customerId: ownerCustomerId,
        productKey: "operis",
        role: "owner",
        status: "active"
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
    expect(entitlement).toMatchObject({ id: "entitlement_123", workspaceId, status: "trial" });
  });
});

describe("upsertEntitlement", () => {
  it("runs workspace validation, mutation, owner seat, and audit creation in one transaction", async () => {
    const operations: string[] = [];
    const tx = {
      workspace: {
        findUnique() {
          operations.push("workspace.findUnique");
          return { ownerCustomerId };
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
            workspaceId,
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 5
          };
        }
      },
      workspaceProductMember: {
        upsert() {
          operations.push("workspaceProductMember.upsert");
          return { id: "seat_123" };
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
        workspaceId,
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        seatsLimit: 5,
        limits: {},
        metadata: {}
      })
    ).rejects.toThrow("audit failed");

    expect(operations).toEqual([
      "transaction.begin",
      "workspace.findUnique",
      "product.findUnique",
      "entitlement.findUnique",
      "entitlement.upsert",
      "workspaceProductMember.upsert",
      "auditLog.create"
    ]);
  });

  it("rejects missing workspaces before mutating entitlements", async () => {
    const operations: string[] = [];
    const tx = {
      workspace: {
        findUnique() {
          operations.push("workspace.findUnique");
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
        workspaceId,
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        seatsLimit: 1,
        limits: {},
        metadata: {}
      })
    ).rejects.toEqual(new ApiError(404, "NOT_FOUND", "Workspace not found."));

    expect(operations).toEqual(["workspace.findUnique"]);
  });

  it("rejects missing products before mutating entitlements", async () => {
    const operations: string[] = [];
    const tx = {
      workspace: {
        findUnique() {
          operations.push("workspace.findUnique");
          return { ownerCustomerId };
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
        workspaceId,
        productKey: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        seatsLimit: 1,
        limits: {},
        metadata: {}
      })
    ).rejects.toEqual(new ApiError(404, "NOT_FOUND", "Product not found."));

    expect(operations).toEqual(["workspace.findUnique", "product.findUnique"]);
  });
});

describe("blockEntitlement", () => {
  it("uses a block-specific audit action and keeps the workspace owner seated", async () => {
    const { prisma, calls } = prismaWithEntitlementMutation();

    await blockEntitlement(prisma, actor, {
      workspaceId,
      productKey: "operis",
      reason: "chargeback"
    });

    expect(calls.entitlementUpsert).toMatchObject({
      update: {
        status: "blocked",
        seatsLimit: 1,
        metadata: { reason: "chargeback" }
      }
    });
    expect(calls.workspaceProductMemberUpsert).toMatchObject({
      update: { role: "owner", status: "active" },
      create: {
        workspaceId,
        customerId: ownerCustomerId,
        productKey: "operis",
        role: "owner",
        status: "active"
      }
    });
    expect(calls.auditCreate).toMatchObject({
      data: {
        action: "entitlement.block"
      }
    });
  });
});
