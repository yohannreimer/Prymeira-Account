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
  process.env.ADMIN_ACTION_TOKEN = "";
  process.env.NODE_ENV = "test";
});

describe("adminRoutes", () => {
  const workspaceId = "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4";
  const customerId = "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0";

  function createEntitlementRoutePrisma() {
    const calls: {
      entitlementUpsert?: {
        where?: unknown;
        update?: Record<string, unknown>;
        create?: Record<string, unknown>;
      };
      workspaceProductMemberUpsert?: unknown;
    } = {};
    const prisma = {
      $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
        return callback(prisma as unknown as PrismaClient);
      },
      workspace: {
        findUnique() {
          return { ownerCustomerId: customerId };
        }
      },
      product: {
        findUnique() {
          return { productKey: "operis" };
        }
      },
      entitlement: {
        findUnique() {
          return null;
        },
        upsert(args: {
          where?: unknown;
          update?: Record<string, unknown>;
          create?: Record<string, unknown>;
        }) {
          calls.entitlementUpsert = args;
          return {
            id: "entitlement_123",
            workspaceId,
            productKey: "operis",
            status: args.update?.status,
            plan: args.update?.plan,
            source: args.update?.source,
            seatsLimit: args.update?.seatsLimit,
            trialEndsAt: args.update?.trialEndsAt ?? null
          };
        }
      },
      workspaceProductMember: {
        upsert(args: unknown) {
          calls.workspaceProductMemberUpsert = args;
          return {
            id: "seat_123",
            workspaceId,
            customerId,
            productKey: "operis",
            role: "owner",
            status: "active"
          };
        }
      },
      auditLog: {
        create() {
          return { id: "audit_123" };
        }
      }
    } as unknown as PrismaClient;

    return { prisma, calls };
  }

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

  it("returns the current admin session", async () => {
    const app = await buildApp({ authVerifier, prisma: {} as PrismaClient });

    const response = await app.inject({
      method: "GET",
      url: "/admin/session",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      admin: true,
      email: "admin@example.com"
    });

    await app.close();
  });

  it("lists products for admin management", async () => {
    let findManyArgs: unknown;
    const prisma = {
      product: {
        findMany(args: unknown) {
          findManyArgs = args;
          return [
            {
              id: "product_1",
              productKey: "crm",
              name: "Vincula",
              description: "CRM para relacionamento.",
              appUrl: "https://crm.prymeiradigital.com.br",
              marketingUrl: "https://prymeiradigital.com.br/crm",
              status: "active"
            }
          ];
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "GET",
      url: "/admin/products",
      headers: { authorization: "Bearer token" }
    });

    expect(response.statusCode).toBe(200);
    expect(findManyArgs).toMatchObject({
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });
    expect(response.json()).toMatchObject({
      products: [
        {
          productKey: "crm",
          name: "Vincula",
          description: "CRM para relacionamento.",
          appUrl: "https://crm.prymeiradigital.com.br",
          marketingUrl: "https://prymeiradigital.com.br/crm",
          status: "active"
        }
      ]
    });

    await app.close();
  });

  it("creates a product with the admin action token", async () => {
    process.env.ADMIN_ACTION_TOKEN = "confirm-admin";
    const calls: { create?: unknown; audit?: unknown } = {};
    const prisma = {
      product: {
        findUnique() {
          return null;
        },
        create(args: unknown) {
          calls.create = args;
          return {
            id: "product_123",
            productKey: "agenda",
            name: "Agenda Pro",
            description: "Agenda para operacoes.",
            appUrl: "https://agenda.prymeiradigital.com.br",
            marketingUrl: "https://prymeiradigital.com.br/agenda",
            status: "active"
          };
        }
      },
      auditLog: {
        create(args: unknown) {
          calls.audit = args;
          return { id: "audit_123" };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/products",
      headers: {
        authorization: "Bearer token",
        "x-admin-action-token": "confirm-admin"
      },
      payload: {
        product_key: "agenda",
        name: "Agenda Pro",
        description: "Agenda para operacoes.",
        app_url: "https://agenda.prymeiradigital.com.br",
        marketing_url: "https://prymeiradigital.com.br/agenda",
        status: "active"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.create).toMatchObject({
      data: {
        productKey: "agenda",
        name: "Agenda Pro",
        description: "Agenda para operacoes.",
        appUrl: "https://agenda.prymeiradigital.com.br",
        marketingUrl: "https://prymeiradigital.com.br/agenda",
        status: "active"
      }
    });
    expect(calls.audit).toMatchObject({
      data: {
        actorClerkUserId: "user_admin",
        action: "product_created",
        targetType: "product",
        targetId: "agenda"
      }
    });
    expect(response.json()).toMatchObject({
      product: {
        productKey: "agenda",
        name: "Agenda Pro"
      }
    });

    await app.close();
  });

  it("updates product details without changing the product key", async () => {
    const calls: { update?: unknown; audit?: unknown } = {};
    const existingProduct = {
      id: "product_123",
      productKey: "crm",
      name: "Vincula",
      description: "CRM antigo.",
      appUrl: "https://crm.prymeiradigital.com.br",
      marketingUrl: "https://prymeiradigital.com.br/crm",
      status: "active"
    };
    const prisma = {
      product: {
        findUnique() {
          return existingProduct;
        },
        update(args: unknown) {
          calls.update = args;
          return {
            ...existingProduct,
            name: "Vincula CRM",
            description: "CRM atualizado.",
            status: "inactive"
          };
        }
      },
      auditLog: {
        create(args: unknown) {
          calls.audit = args;
          return { id: "audit_123" };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/products/crm",
      headers: { authorization: "Bearer token" },
      payload: {
        name: "Vincula CRM",
        description: "CRM atualizado.",
        app_url: "https://crm.prymeiradigital.com.br",
        marketing_url: "https://prymeiradigital.com.br/vincula",
        status: "inactive"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.update).toMatchObject({
      where: { productKey: "crm" },
      data: {
        name: "Vincula CRM",
        description: "CRM atualizado.",
        appUrl: "https://crm.prymeiradigital.com.br",
        marketingUrl: "https://prymeiradigital.com.br/vincula",
        status: "inactive"
      }
    });
    expect(calls.update).not.toMatchObject({
      data: {
        productKey: expect.any(String)
      }
    });
    expect(calls.audit).toMatchObject({
      data: {
        actorClerkUserId: "user_admin",
        action: "product_updated",
        targetType: "product",
        targetId: "crm"
      }
    });
    expect(response.json()).toMatchObject({
      product: {
        productKey: "crm",
        name: "Vincula CRM",
        status: "inactive"
      }
    });

    await app.close();
  });

  it("requires the admin action token for entitlement mutations when configured", async () => {
    process.env.ADMIN_ACTION_TOKEN = "confirm-admin";
    const { prisma, calls } = createEntitlementRoutePrisma();
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements",
      headers: { authorization: "Bearer token" },
      payload: {
        workspace_id: workspaceId,
        product_key: "operis",
        status: "active",
        plan: "pro",
        source: "admin"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "FORBIDDEN",
        message: "Valid admin action token is required."
      }
    });
    expect(calls.entitlementUpsert).toBeUndefined();

    await app.close();
  });

  it("accepts entitlement mutations with the matching admin action token", async () => {
    process.env.ADMIN_ACTION_TOKEN = "confirm-admin";
    const { prisma, calls } = createEntitlementRoutePrisma();
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements",
      headers: {
        authorization: "Bearer token",
        "x-admin-action-token": "confirm-admin"
      },
      payload: {
        workspace_id: workspaceId,
        product_key: "operis",
        status: "active",
        plan: "pro",
        source: "admin"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.entitlementUpsert).toMatchObject({
      create: {
        workspaceId,
        productKey: "operis"
      }
    });

    await app.close();
  });

  it("returns customer audit logs for the customer and their entitlements", async () => {
    const calls: { auditFindMany?: unknown } = {};
    const customer = {
      id: customerId,
      subscriptions: [],
      workspaceMembers: [
        {
          workspace: {
            id: workspaceId,
            entitlements: [
              { id: "entitlement_1", customerId: null, productKey: "financeiro" },
              { id: "entitlement_2", customerId: null, productKey: "orquestrador" }
            ],
            members: [
              {
                role: "owner",
                customer: { id: customerId, email: "owner@example.com" }
              }
            ],
            productMembers: [
              {
                workspaceId,
                customerId,
                productKey: "financeiro",
                status: "active"
              }
            ]
          }
        }
      ]
    };
    let customerFindUniqueArgs: unknown;
    const prisma = {
      customer: {
        findUnique(args: unknown) {
          customerFindUniqueArgs = args;
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
    expect(customerFindUniqueArgs).toMatchObject({
      include: {
        subscriptions: true,
        workspaceMembers: {
          where: {
            status: "active",
            workspace: { status: "active" }
          },
          include: {
            workspace: {
              include: {
                entitlements: true,
                members: { include: { customer: true } },
                productMembers: true
              }
            }
          }
        }
      }
    });
    expect(response.json()).toMatchObject({
      customer: {
        workspaces: [
          {
            id: workspaceId,
            entitlements: [
              { id: "entitlement_1", customerId: null, productKey: "financeiro" },
              { id: "entitlement_2", customerId: null, productKey: "orquestrador" }
            ],
            members: [
              {
                role: "owner",
                customer: { id: customerId, email: "owner@example.com" }
              }
            ],
            productMembers: [
              {
                workspaceId,
                customerId,
                productKey: "financeiro",
                status: "active"
              }
            ]
          }
        ],
        entitlements: [
          { id: "entitlement_1", customerId: null, productKey: "financeiro" },
          { id: "entitlement_2", customerId: null, productKey: "orquestrador" }
        ]
      }
    });
    expect(calls.auditFindMany).toMatchObject({
      where: { targetId: { in: [customer.id, "entitlement_1", "entitlement_2"] } },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    await app.close();
  });

  it("preserves omitted nullable date fields when upserting entitlements", async () => {
    const calls: {
      upsert?: { update?: unknown; create?: unknown };
      workspaceProductMemberUpsert?: unknown;
    } = {};
    const entitlement = {
      id: "entitlement_123",
      workspaceId,
      productKey: "operis",
      status: "active",
      plan: "pro",
      source: "admin",
      seatsLimit: 5
    };
    const prisma = {
      $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
        return callback(prisma as unknown as PrismaClient);
      },
      workspace: {
        findUnique() {
          return { ownerCustomerId: customerId };
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
      workspaceProductMember: {
        upsert(args: unknown) {
          calls.workspaceProductMemberUpsert = args;
          return { id: "seat_123" };
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
        workspace_id: workspaceId,
        product_key: entitlement.productKey,
        status: "active",
        plan: "pro",
        source: "admin",
        seats_limit: 5
      }
    });

    expect(response.statusCode).toBe(200);
    expect(calls.upsert?.update).not.toHaveProperty("endsAt");
    expect(calls.upsert?.update).not.toHaveProperty("trialEndsAt");
    expect(calls.upsert?.update).not.toHaveProperty("currentPeriodEndsAt");
    expect(calls.upsert?.create).not.toHaveProperty("endsAt");
    expect(calls.upsert?.create).not.toHaveProperty("trialEndsAt");
    expect(calls.upsert?.create).not.toHaveProperty("currentPeriodEndsAt");
    expect(calls.upsert?.create).toMatchObject({
      workspaceId,
      seatsLimit: 5
    });
    expect(calls.workspaceProductMemberUpsert).toMatchObject({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId,
          customerId,
          productKey: "operis"
        }
      },
      update: { role: "owner", status: "active" }
    });

    await app.close();
  });

  it("preserves existing seats when seats_limit is omitted", async () => {
    const calls: { upsert?: { update?: unknown; create?: unknown } } = {};
    const prisma = {
      $transaction<T>(callback: (tx: PrismaClient) => Promise<T>) {
        return callback(prisma as unknown as PrismaClient);
      },
      workspace: {
        findUnique() {
          return { ownerCustomerId: customerId };
        }
      },
      product: {
        findUnique() {
          return { productKey: "operis" };
        }
      },
      entitlement: {
        findUnique() {
          return {
            id: "entitlement_123",
            workspaceId,
            customerId,
            productKey: "operis",
            status: "active",
            plan: "pro",
            source: "admin",
            seatsLimit: 12
          };
        },
        upsert(args: { update?: unknown; create?: unknown }) {
          calls.upsert = args;
          return {
            id: "entitlement_123",
            workspaceId,
            customerId: null,
            productKey: "operis",
            status: "blocked",
            plan: "blocked",
            source: "admin",
            seatsLimit: 12
          };
        }
      },
      workspaceProductMember: {
        upsert() {
          return { id: "seat_123" };
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
        workspace_id: workspaceId,
        product_key: "operis",
        status: "blocked",
        plan: "blocked",
        source: "admin"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entitlement: {
        customerId: null,
        seatsLimit: 12
      }
    });
    expect(calls.upsert?.update).toMatchObject({
      customerId: null
    });
    expect(calls.upsert?.update).not.toHaveProperty("seatsLimit");
    expect(calls.upsert?.create).toMatchObject({
      customerId: null,
      seatsLimit: 1
    });

    await app.close();
  });

  it("grants entitlement to a workspace and creates owner product seat", async () => {
    const { prisma, calls } = createEntitlementRoutePrisma();
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements",
      headers: { authorization: "Bearer token" },
      payload: {
        workspace_id: workspaceId,
        product_key: "operis",
        status: "active",
        plan: "pro",
        source: "admin",
        seats_limit: 7
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entitlement: {
        workspaceId,
        productKey: "operis",
        status: "active",
        seatsLimit: 7
      }
    });
    expect(calls.entitlementUpsert).toMatchObject({
      where: {
        workspaceId_productKey: {
          workspaceId,
          productKey: "operis"
        }
      },
      update: {
        status: "active",
        seatsLimit: 7
      },
      create: {
        workspaceId,
        productKey: "operis",
        seatsLimit: 7
      }
    });
    expect(calls.workspaceProductMemberUpsert).toMatchObject({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId,
          customerId,
          productKey: "operis"
        }
      },
      update: { role: "owner", status: "active" },
      create: {
        workspaceId,
        customerId,
        productKey: "operis",
        role: "owner",
        status: "active"
      }
    });

    await app.close();
  });

  it("blocks a workspace entitlement", async () => {
    const { prisma, calls } = createEntitlementRoutePrisma();
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements/block",
      headers: { authorization: "Bearer token" },
      payload: {
        workspace_id: workspaceId,
        product_key: "operis",
        reason: "chargeback"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entitlement: {
        workspaceId,
        productKey: "operis",
        status: "blocked",
        seatsLimit: 1
      }
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
        customerId,
        productKey: "operis",
        role: "owner",
        status: "active"
      }
    });

    await app.close();
  });

  it("grants a trial to a workspace", async () => {
    const { prisma, calls } = createEntitlementRoutePrisma();
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/admin/entitlements/trial",
      headers: { authorization: "Bearer token" },
      payload: {
        workspace_id: workspaceId,
        product_key: "operis",
        plan: "trial",
        trial_days: 14
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entitlement: {
        workspaceId,
        productKey: "operis",
        status: "trial",
        seatsLimit: 1
      }
    });
    expect(calls.entitlementUpsert).toMatchObject({
      update: {
        status: "trial",
        plan: "trial",
        source: "trial",
        seatsLimit: 1,
        metadata: { trial_days: 14 }
      }
    });
    expect(calls.entitlementUpsert?.update?.trialEndsAt).toBeInstanceOf(Date);
    expect(calls.workspaceProductMemberUpsert).toMatchObject({
      update: { role: "owner", status: "active" },
      create: {
        workspaceId,
        customerId,
        productKey: "operis",
        role: "owner",
        status: "active"
      }
    });

    await app.close();
  });
});
