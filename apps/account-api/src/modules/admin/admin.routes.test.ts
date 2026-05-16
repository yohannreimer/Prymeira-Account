import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import type { AuthVerifier } from "../auth/types.js";

const authVerifier: AuthVerifier = {
  async verifyBearerToken() {
    return {
      clerkUserId: "user_admin",
      email: "admin@example.com"
    };
  }
};

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
});

describe("adminRoutes", () => {
  it("returns 403 when a non-admin user lists customers", async () => {
    const nonAdminAuthVerifier: AuthVerifier = {
      async verifyBearerToken() {
        return {
          clerkUserId: "user_non_admin",
          email: "user@example.com"
        };
      }
    };
    const prisma = {
      customer: {
        findMany() {
          throw new Error("customer list should not run for non-admin users");
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier: nonAdminAuthVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: "/admin/customers",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "FORBIDDEN"
      }
    });

    await app.close();
  });

  it("returns customer audit logs for the customer and their entitlements", async () => {
    const calls: { auditFindMany?: unknown } = {};
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      entitlements: [{ id: "entitlement_1" }, { id: "entitlement_2" }],
      subscriptions: []
    };
    const prisma = {
      customer: {
        findUnique() {
          return customer;
        }
      },
      auditLog: {
        findMany(args: unknown) {
          calls.auditFindMany = args;
          return [];
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: `/admin/customers/${customer.id}`,
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.auditFindMany).toMatchObject({
      where: { targetId: { in: [customer.id, "entitlement_1", "entitlement_2"] } },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    await app.close();
  });

  it("preserves omitted nullable date fields when upserting entitlements", async () => {
    const calls: { upsert?: { update?: unknown; create?: unknown } } = {};
    const entitlement = {
      id: "entitlement_123",
      customerId: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      productKey: "operis",
      status: "active",
      plan: "pro",
      source: "admin"
    };
    const prisma = {
      $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
        return callback(prisma as unknown as PrismaClient);
      },
      customer: {
        findUnique() {
          return { id: entitlement.customerId };
        }
      },
      product: {
        findUnique() {
          return { productKey: entitlement.productKey };
        }
      },
      entitlement: {
        findUnique() {
          return {
            ...entitlement,
            endsAt: new Date("2026-06-01T00:00:00.000Z"),
            trialEndsAt: new Date("2026-05-30T00:00:00.000Z"),
            currentPeriodEndsAt: new Date("2026-06-30T00:00:00.000Z")
          };
        },
        upsert(args: { update?: unknown; create?: unknown }) {
          calls.upsert = args;
          return entitlement;
        }
      },
      auditLog: {
        create() {
          return { id: "audit_123" };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements",
      headers: { authorization: "Bearer token" },
      payload: {
        customer_id: entitlement.customerId,
        product_key: entitlement.productKey,
        status: "active",
        plan: "pro",
        source: "admin"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.upsert?.update).not.toHaveProperty("endsAt");
    expect(calls.upsert?.update).not.toHaveProperty("trialEndsAt");
    expect(calls.upsert?.update).not.toHaveProperty("currentPeriodEndsAt");
    expect(calls.upsert?.create).not.toHaveProperty("endsAt");
    expect(calls.upsert?.create).not.toHaveProperty("trialEndsAt");
    expect(calls.upsert?.create).not.toHaveProperty("currentPeriodEndsAt");

    await app.close();
  });
});
