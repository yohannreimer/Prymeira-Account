import Stripe from "stripe";
import type { Env } from "../../env.js";
import { ApiError } from "../../lib/errors.js";

type CreateCheckoutSessionInput = {
  planId: string;
  billing: "monthly" | "annual";
  clerkUserId: string;
  successUrl: string;
  cancelUrl: string;
};

function buildPriceIdMap(env: Env): Map<string, string> {
  return new Map([
    ["start:monthly",       env.STRIPE_PRICE_START_MONTHLY],
    ["start:annual",        env.STRIPE_PRICE_START_ANNUAL],
    ["empresa:monthly",     env.STRIPE_PRICE_EMPRESA_MONTHLY],
    ["empresa:annual",      env.STRIPE_PRICE_EMPRESA_ANNUAL],
    ["empresa-pro:monthly", env.STRIPE_PRICE_EMPRESA_PRO_MONTHLY],
    ["empresa-pro:annual",  env.STRIPE_PRICE_EMPRESA_PRO_ANNUAL],
    ["suite:monthly",       env.STRIPE_PRICE_SUITE_MONTHLY],
    ["suite:annual",        env.STRIPE_PRICE_SUITE_ANNUAL],
    ["operis:monthly",      env.STRIPE_PRICE_OPERIS_MONTHLY],
    ["operis:annual",       env.STRIPE_PRICE_OPERIS_ANNUAL],
    ["media:monthly",       env.STRIPE_PRICE_MEDIA_MONTHLY],
    ["media:annual",        env.STRIPE_PRICE_MEDIA_ANNUAL]
  ]);
}

export async function createCheckoutSession(
  stripe: Stripe,
  env: Env,
  input: CreateCheckoutSessionInput
): Promise<{ checkoutUrl: string }> {
  const key = `${input.planId}:${input.billing}`;
  const priceId = buildPriceIdMap(env).get(key);

  if (!priceId) {
    throw new ApiError(400, "VALIDATION_ERROR", `Unknown plan/billing combination: ${key}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      clerk_user_id: input.clerkUserId,
      plan_id: input.planId,
      billing: input.billing
    },
    client_reference_id: input.clerkUserId
  });

  if (!session.url) {
    throw new ApiError(500, "INTERNAL_ERROR", "Stripe did not return a checkout URL.");
  }

  return { checkoutUrl: session.url };
}
