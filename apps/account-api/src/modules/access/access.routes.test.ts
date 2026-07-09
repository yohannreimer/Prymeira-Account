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
  it("syncs an authenticated user before checking access when no customer exists yet", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      clerkUserId: "user_123",
      email: "user@example.com",
      name: null
    };
    const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
    const calls: { customerUpsert?: unknown } = {};
    const prisma = {
      customer: {
        findUnique() {
          return null;
        },
        upsert(args: unknown) {
          calls.customerUpsert = args;
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
          return null;
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
    expect(calls.customerUpsert).toMatchObject({
      where: { clerkUserId: "user_123" },
      update: { email: "user@example.com" },
      create: {
        clerkUserId: "user_123",
        email: "user@example.com",
        name: null
      }
    });
    expect(response.json()).toMatchObject({
      allowed: false,
      product_key: "operis",
      reason: "no_product_seat"
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
      workspace_name: "User Workspace",
      workspace_role: "owner",
      customer_id: customer.id,
      customer_name: "User",
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
    const calls: {
      entitlementFindUnique: unknown[];
      workspaceProductMemberFindFirst: unknown[];
      workspaceProductMemberFindUnique: unknown[];
    } = {
      entitlementFindUnique: [],
      workspaceProductMemberFindFirst: [],
      workspaceProductMemberFindUnique: []
    };
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
        findUnique(args: { where: { workspaceId_productKey: { productKey: string } } }) {
          calls.entitlementFindUnique.push(args);
          return {
            workspaceId,
            customerId: null,
            productKey: args.where.workspaceId_productKey.productKey,
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 2,
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: {}
          };
        }
      },
      workspaceProductMember: {
        findFirst(args: unknown) {
          calls.workspaceProductMemberFindFirst.push(args);
          return null;
        },
        findUnique(args: { where: { workspaceId_customerId_productKey: { productKey: string } } }) {
          calls.workspaceProductMemberFindUnique.push(args);
          if (args.where.workspaceId_customerId_productKey.productKey === "financeiro") {
            return {
              workspaceId,
              customerId: customer.id,
              productKey: "financeiro",
              role: "admin",
              status: "active"
            };
          }

          return null;
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
    expect(calls.entitlementFindUnique).toHaveLength(2);
    expect(calls.workspaceProductMemberFindUnique).toHaveLength(2);
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

  it("uses the invited product workspace when listing Hub products", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      email: "user@example.com",
      name: "User"
    };
    const individualWorkspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
    const teamWorkspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b5";
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
              productKey: "talk",
              name: "Talk",
              description: "Atendimento.",
              appUrl: "https://talk.example",
              marketingUrl: "https://talk.example/upgrade",
              status: "active"
            }
          ];
        }
      },
      workspaceMember: {
        findFirst() {
          return {
            workspaceId: individualWorkspaceId,
            role: "owner",
            status: "active",
            workspace: {
              id: individualWorkspaceId,
              name: "Workspace Individual",
              type: "individual",
              status: "active"
            }
          };
        },
        findUnique() {
          return {
            workspaceId: teamWorkspaceId,
            role: "member",
            status: "active",
            workspace: {
              id: teamWorkspaceId,
              name: "Prymeira SaaS",
              type: "company",
              status: "active"
            }
          };
        }
      },
      entitlement: {
        findUnique() {
          return {
            workspaceId: teamWorkspaceId,
            customerId: null,
            productKey: "talk",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 5,
            endsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: null,
            limits: {}
          };
        }
      },
      workspaceProductMember: {
        findFirst() {
          return {
            workspaceId: teamWorkspaceId,
            customerId: customer.id,
            productKey: "talk",
            role: "member",
            status: "active"
          };
        },
        findUnique() {
          return {
            workspaceId: teamWorkspaceId,
            customerId: customer.id,
            productKey: "talk",
            role: "member",
            status: "active"
          };
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
    expect(response.json()).toMatchObject({
      workspace: {
        id: teamWorkspaceId,
        name: "Prymeira SaaS",
        role: "member"
      },
      products: [
        {
          product_key: "talk",
          allowed: true,
          workspace_id: teamWorkspaceId,
          workspace_role: "member",
          product_role: "member"
        }
      ]
    });

    await app.close();
  });
});
