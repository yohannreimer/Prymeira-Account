import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createStaticAuthVerifier } from "../../../test/auth-fixtures.js";

const authVerifier = createStaticAuthVerifier({
  clerkUserId: "user_123",
  email: "user@example.com"
});

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
});

describe("accessRoutes", () => {
  it("denies access when the authenticated user has no customer", async () => {
    const prisma = {
      customer: {
        findUnique() {
          return null;
        }
      },
      product: {
        findUnique() {
          return {
            productKey: "operis",
            status: "active",
            marketingUrl: "https://operis.example/upgrade"
          };
        }
      },
      entitlement: {
        findUnique() {
          throw new Error("entitlement lookup should not run without a customer");
        }
      },
      workspaceMember: {
        findFirst() {
          throw new Error("workspace lookup should not run without a customer");
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: "/access-check?product_key=operis",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      allowed: false,
      product_key: "operis",
      reason: "no_customer"
    });

    await app.close();
  });

  it("allows access for an active entitlement", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const calls: { workspaceMemberFindFirst?: unknown; entitlementFindUnique?: unknown } = {};
    const prisma = {
      customer: {
        findUnique() {
          return customer;
        }
      },
      product: {
        findUnique() {
          return {
            productKey: "operis",
            status: "active",
            marketingUrl: "https://operis.example/upgrade"
          };
        }
      },
      workspaceMember: {
        findFirst(args: unknown) {
          calls.workspaceMemberFindFirst = args;
          return { workspaceId: "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4" };
        }
      },
      entitlement: {
        findUnique(args: unknown) {
          calls.entitlementFindUnique = args;
          return {
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: { seats: 3 }
          };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: "/access-check?product_key=operis",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.workspaceMemberFindFirst).toMatchObject({
      where: {
        customerId: customer.id,
        status: "active",
        workspace: { status: "active" }
      },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true }
    });
    expect(calls.entitlementFindUnique).toMatchObject({
      where: {
        workspaceId_productKey: {
          workspaceId: "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4",
          productKey: "operis"
        }
      }
    });
    expect(response.json()).toMatchObject({
      allowed: true,
      product_key: "operis",
      status: "active",
      plan: "pro",
      source: "admin",
      limits: { seats: 3 },
      reason: "active_entitlement"
    });

    await app.close();
  });
});
