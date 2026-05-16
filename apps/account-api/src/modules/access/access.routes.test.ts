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

  it("allows access only when workspace, entitlement, and product seat are active", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
    const calls: {
      workspaceMemberFindFirst?: unknown;
      entitlementFindUnique?: unknown;
      workspaceProductMemberFindUnique?: unknown;
    } = {};
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
          return {
            workspaceId,
            role: "owner",
            status: "active",
            workspace: {
              id: workspaceId,
              name: "User Workspace",
              type: "individual",
              status: "active"
            }
          };
        }
      },
      entitlement: {
        findUnique(args: unknown) {
          calls.entitlementFindUnique = args;
          return {
            workspaceId,
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 3,
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: { seats: 3 }
          };
        }
      },
      workspaceProductMember: {
        findUnique(args: unknown) {
          calls.workspaceProductMemberFindUnique = args;
          return {
            workspaceId,
            customerId: customer.id,
            productKey: "operis",
            role: "admin",
            status: "active"
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
      include: { workspace: true }
    });
    expect(calls.entitlementFindUnique).toMatchObject({
      where: {
        workspaceId_productKey: {
          workspaceId,
          productKey: "operis"
        }
      }
    });
    expect(calls.workspaceProductMemberFindUnique).toMatchObject({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId,
          customerId: customer.id,
          productKey: "operis"
        }
      }
    });
    expect(response.json()).toMatchObject({
      allowed: true,
      workspace_id: workspaceId,
      workspace_role: "owner",
      product_key: "operis",
      product_role: "admin",
      status: "active",
      plan: "pro",
      source: "admin",
      seats_limit: 3,
      limits: { seats: 3 },
      reason: "active_entitlement"
    });

    await app.close();
  });

  it("denies access when the loaded product seat does not match workspace context", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
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
        findFirst() {
          return {
            workspaceId,
            role: "owner",
            status: "active",
            workspace: {
              id: workspaceId,
              name: "User Workspace",
              type: "individual",
              status: "active"
            }
          };
        }
      },
      entitlement: {
        findUnique() {
          return {
            workspaceId,
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 1,
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: {}
          };
        }
      },
      workspaceProductMember: {
        findUnique() {
          return {
            workspaceId: "313bb356-3c41-4fac-afb6-0af0ed330992",
            customerId: customer.id,
            productKey: "operis",
            role: "admin",
            status: "active"
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
    expect(response.json()).toMatchObject({
      allowed: false,
      product_key: "operis",
      reason: "no_product_seat"
    });

    await app.close();
  });

  it("denies access when the customer has no workspace", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
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
        findFirst() {
          return null;
        }
      },
      entitlement: {
        findUnique() {
          throw new Error("entitlement lookup should not run without a workspace");
        }
      },
      workspaceProductMember: {
        findUnique() {
          throw new Error("product seat lookup should not run without a workspace");
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
      reason: "no_workspace"
    });

    await app.close();
  });

  it("denies access when the customer has no active workspace membership", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
    const memberships = [
      null,
      null,
      {
        workspaceId,
        role: "owner",
        status: "inactive",
        workspace: {
          id: workspaceId,
          name: "User Workspace",
          type: "individual",
          status: "active"
        }
      }
    ];
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
        findFirst() {
          return memberships.shift() ?? null;
        }
      },
      entitlement: {
        findUnique() {
          throw new Error("entitlement lookup should not run without an active membership");
        }
      },
      workspaceProductMember: {
        findUnique() {
          throw new Error("product seat lookup should not run without an active membership");
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
      reason: "no_workspace_membership"
    });

    await app.close();
  });

  it("denies access when the workspace has no product seat", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
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
        findFirst() {
          return {
            workspaceId,
            role: "owner",
            status: "active",
            workspace: {
              id: workspaceId,
              name: "User Workspace",
              type: "individual",
              status: "active"
            }
          };
        }
      },
      entitlement: {
        findUnique() {
          return {
            workspaceId,
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 1,
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: {}
          };
        }
      },
      workspaceProductMember: {
        findUnique() {
          return null;
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
      reason: "no_product_seat",
      upgrade_url: "https://operis.example/upgrade"
    });

    await app.close();
  });

  it("returns workspace context in /me/products", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
    const calls: { entitlementFindMany?: unknown; workspaceProductMemberFindMany?: unknown } = {};
    const prisma = {
      customer: {
        findUnique() {
          return customer;
        }
      },
      product: {
        findMany() {
          return [
            {
              productKey: "financeiro",
              name: "Financeiro",
              description: "Gestao financeira.",
              appUrl: "https://financeiro.example",
              marketingUrl: "https://financeiro.example/upgrade",
              status: "active"
            },
            {
              productKey: "orquestrador",
              name: "Orquestrador",
              description: "Automacao operacional.",
              appUrl: "https://orquestrador.example",
              marketingUrl: "https://orquestrador.example/upgrade",
              status: "active"
            }
          ];
        }
      },
      workspaceMember: {
        findFirst() {
          return {
            workspaceId,
            role: "owner",
            status: "active",
            workspace: {
              id: workspaceId,
              name: "User Workspace",
              type: "individual",
              status: "active"
            }
          };
        }
      },
      entitlement: {
        findMany(args: unknown) {
          calls.entitlementFindMany = args;
          return [
            {
              workspaceId,
              customerId: null,
              productKey: "financeiro",
              status: "active",
              plan: "pro",
              source: "admin",
              seatsLimit: 2,
              endsAt: null,
              trialEndsAt: null,
              currentPeriodEndsAt: null,
              limits: {}
            },
            {
              workspaceId,
              customerId: null,
              productKey: "orquestrador",
              status: "active",
              plan: "pro",
              source: "admin",
              seatsLimit: 2,
              endsAt: null,
              trialEndsAt: null,
              currentPeriodEndsAt: null,
              limits: {}
            }
          ];
        }
      },
      workspaceProductMember: {
        findMany(args: unknown) {
          calls.workspaceProductMemberFindMany = args;
          return [
            {
              workspaceId,
              customerId: customer.id,
              productKey: "financeiro",
              role: "admin",
              status: "active"
            }
          ];
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: "/me/products",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.entitlementFindMany).toMatchObject({
      where: { workspaceId }
    });
    expect(calls.workspaceProductMemberFindMany).toMatchObject({
      where: {
        workspaceId,
        customerId: customer.id,
        productKey: { in: ["financeiro", "orquestrador"] }
      }
    });
    expect(response.json()).toMatchObject({
      workspace: {
        id: workspaceId,
        name: "User Workspace",
        type: "individual",
        role: "owner"
      },
      products: [
        {
          product_key: "financeiro",
          allowed: true,
          status: "active",
          plan: "pro",
          seats_limit: 2,
          workspace_id: workspaceId,
          workspace_role: "owner",
          product_role: "admin",
          reason: "active_entitlement"
        },
        {
          product_key: "orquestrador",
          allowed: false,
          status: "locked",
          reason: "no_product_seat"
        }
      ]
    });

    await app.close();
  });
});
