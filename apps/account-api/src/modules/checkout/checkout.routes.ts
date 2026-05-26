import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { loadEnv } from "../../env.js";
import Stripe from "stripe";
import { createCheckoutSession } from "./checkout.service.js";

const checkoutBodySchema = z.object({
  plan_id: z.string().min(1),
  billing: z.enum(["monthly", "annual"]),
  success_url: z.string().url(),
  cancel_url: z.string().url()
});

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post("/checkout", async (request, reply) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const body = checkoutBodySchema.parse(request.body);
    const env = loadEnv();

    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({
        error: { code: "INTERNAL_ERROR", message: "Checkout is not configured." }
      });
    }

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
