import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { isDemoMode, loadEnv } from "../../env.js";
import Stripe from "stripe";
import { ApiError } from "../../lib/errors.js";
import { createCheckoutSession } from "./checkout.service.js";
import { ensureCustomerForAuthenticatedUser } from "../customers/customers.service.js";

const checkoutBodySchema = z.object({
  plan_id: z.string().min(1),
  billing: z.enum(["monthly", "annual"]),
  success_url: z.string().url(),
  cancel_url: z.string().url()
});

const productionCheckoutHosts = new Set([
  "hub.prymeiradigital.com.br",
  "prymeiradigital.com.br",
  "www.prymeiradigital.com.br"
]);

const localCheckoutHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function isAllowedCheckoutRedirect(rawUrl: string, nodeEnv: string): boolean {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  if (productionCheckoutHosts.has(hostname)) {
    return url.protocol === "https:";
  }

  if (nodeEnv !== "production" && localCheckoutHosts.has(hostname)) {
    return url.protocol === "http:" || url.protocol === "https:";
  }

  return false;
}

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post("/checkout", async (request, reply) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const body = checkoutBodySchema.parse(request.body);
    const env = loadEnv();

    if (
      !isAllowedCheckoutRedirect(body.success_url, env.NODE_ENV) ||
      !isAllowedCheckoutRedirect(body.cancel_url, env.NODE_ENV)
    ) {
      throw new ApiError(400, "VALIDATION_ERROR", "Checkout redirect URL is not allowed.");
    }

    if (isDemoMode(env)) {
      const checkoutUrl = new URL(body.success_url);
      checkoutUrl.searchParams.set("demo_checkout", "1");

      return reply.status(200).send({ checkout_url: checkoutUrl.toString() });
    }

    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({
        error: { code: "INTERNAL_ERROR", message: "Checkout is not configured." }
      });
    }

    await ensureCustomerForAuthenticatedUser(app.prisma, user);

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const { checkoutUrl } = await createCheckoutSession(stripe, env, {
      planId: body.plan_id,
      billing: body.billing,
      clerkUserId: user.clerkUserId,
      successUrl: body.success_url,
      cancelUrl: body.cancel_url
    });

    return reply.status(200).send({ checkout_url: checkoutUrl });
  });
};
