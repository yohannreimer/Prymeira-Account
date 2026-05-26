import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { loadEnv } from "../../env.js";
import { handleStripeEvent } from "./webhook.service.js";

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  app.post("/webhook/stripe", async (request, reply) => {
    const env = loadEnv();

    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: { code: "INTERNAL_ERROR", message: "Webhook not configured." } });
    }

    const sig = request.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Missing stripe-signature header." } });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid webhook signature." } });
    }

    await handleStripeEvent(app.prisma, stripe, event);

    return reply.status(200).send({ received: true });
  });
};
