import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app.js";
import * as webhookService from "./webhook.service.js";

vi.mock("./webhook.service.js", () => ({
  handleStripeEvent: vi.fn()
}));

vi.mock("stripe", () => {
  const mockConstructEvent = vi.fn();
  const MockStripe = vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: vi.fn() }
  }));
  (MockStripe as any)._mockConstructEvent = mockConstructEvent;
  return { default: MockStripe };
});

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  process.env.NODE_ENV = "test";
  vi.clearAllMocks();
});

const mockPrisma = {} as unknown as PrismaClient;

describe("webhookRoutes", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: { "content-type": "application/json" },
      payload: Buffer.from('{"type":"checkout.session.completed"}')
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("returns 400 when stripe signature is invalid", async () => {
    const { default: Stripe } = await import("stripe");
    (Stripe as any)._mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });

    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid"
      },
      payload: Buffer.from('{"type":"checkout.session.completed"}')
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("calls handleStripeEvent and returns 200 on valid event", async () => {
    const fakeEvent = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_abc", metadata: { clerk_user_id: "user_123", plan_id: "start" } } }
    };
    const { default: Stripe } = await import("stripe");
    (Stripe as any)._mockConstructEvent.mockReturnValue(fakeEvent);
    vi.mocked(webhookService.handleStripeEvent).mockResolvedValue(undefined);

    const app = await buildApp({ prisma: mockPrisma });

    const response = await app.inject({
      method: "POST",
      url: "/webhook/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=123,v1=abc"
      },
      payload: Buffer.from(JSON.stringify(fakeEvent))
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(webhookService.handleStripeEvent).toHaveBeenCalledWith(
      mockPrisma,
      expect.any(Object),
      fakeEvent
    );
    await app.close();
  });
});
