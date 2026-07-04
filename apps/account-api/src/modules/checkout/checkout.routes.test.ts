import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import { ApiError } from "../../lib/errors.js";
import * as checkoutService from "./checkout.service.js";

vi.mock("./checkout.service.js", () => ({
  createCheckoutSession: vi.fn()
}));

const authVerifier = {
  async verifyBearerToken(authorizationHeader: string | undefined) {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
    }
    return { clerkUserId: "user_123", email: "user@example.com" };
  }
};

const prisma = {
  customer: {
    findUnique() {
      return {
        id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
        clerkUserId: "user_123",
        email: "user@example.com",
        name: null
      };
    }
  }
} as unknown as PrismaClient;

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_PRICE_START_MONTHLY = "price_start_m";
  process.env.NODE_ENV = "test";
  vi.clearAllMocks();
});

describe("checkoutRoutes", () => {
  it("returns 401 when no auth header is provided", async () => {
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeiradigital.com.br/planos?success=1",
        cancel_url: "https://hub.prymeiradigital.com.br/planos"
      }
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 400 when body is invalid", async () => {
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: { plan_id: "start" }
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns 503 when Stripe is not configured", async () => {
    process.env.STRIPE_SECRET_KEY = "";
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeiradigital.com.br/planos?success=1",
        cancel_url: "https://hub.prymeiradigital.com.br/planos"
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Checkout is not configured." }
    });
    await app.close();
  });

  it("returns checkout_url when service succeeds", async () => {
    vi.mocked(checkoutService.createCheckoutSession).mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_abc"
    });

    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeiradigital.com.br/planos?success=1",
        cancel_url: "https://hub.prymeiradigital.com.br/planos"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      checkout_url: "https://checkout.stripe.com/pay/cs_test_abc"
    });
    expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ STRIPE_SECRET_KEY: "sk_test_fake" }),
      expect.objectContaining({
        planId: "start",
        billing: "monthly",
        clerkUserId: "user_123"
      })
    );
    await app.close();
  });

  it("rejects checkout redirects outside Prymeira and local development hosts", async () => {
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://evil.example/steal",
        cancel_url: "https://hub.prymeiradigital.com.br/planos"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
    expect(checkoutService.createCheckoutSession).not.toHaveBeenCalled();
    await app.close();
  });

  it("syncs the authenticated customer before creating a checkout session", async () => {
    vi.mocked(checkoutService.createCheckoutSession).mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_abc"
    });
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      clerkUserId: "user_123",
      email: "user@example.com",
      name: null
    };
    const calls: { customerUpsert?: unknown } = {};
    const prismaWithCustomerSync = {
      customer: {
        findUnique() {
          return null;
        },
        upsert(args: unknown) {
          calls.customerUpsert = args;
          return customer;
        }
      },
      workspaceMember: {
        findFirst() {
          return {
            id: "member_123",
            customerId: customer.id,
            workspaceId: "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4",
            role: "owner",
            status: "active",
            workspace: {
              id: "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4",
              name: "User",
              type: "individual",
              status: "active"
            }
          };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma: prismaWithCustomerSync });

    const response = await app.inject({
      method: "POST",
      url: "/checkout",
      headers: { authorization: "Bearer token" },
      payload: {
        plan_id: "start",
        billing: "monthly",
        success_url: "https://hub.prymeiradigital.com.br/planos?success=1",
        cancel_url: "https://hub.prymeiradigital.com.br/planos"
      }
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
    await app.close();
  });
});
