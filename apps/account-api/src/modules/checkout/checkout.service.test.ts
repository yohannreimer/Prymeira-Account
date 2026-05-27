import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../env.js";
import { createCheckoutSession } from "./checkout.service.js";

const env = {
  STRIPE_PRICE_EMPRESA_MONTHLY: "price_empresa_monthly"
} as Env;

describe("createCheckoutSession", () => {
  it("creates subscription checkout with a 14 day card-backed trial", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test" });
    const stripe = {
      checkout: {
        sessions: { create }
      }
    } as unknown as Stripe;

    await createCheckoutSession(stripe, env, {
      planId: "empresa",
      billing: "monthly",
      clerkUserId: "user_123",
      successUrl: "https://hub.prymeira.com/planos?success=1",
      cancelUrl: "https://hub.prymeira.com/planos"
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_collection: "always",
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
          metadata: expect.objectContaining({
            clerk_user_id: "user_123",
            plan_id: "empresa",
            billing: "monthly"
          })
        })
      })
    );
  });
});
