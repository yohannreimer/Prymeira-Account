import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { loadEnv } from "../../env.js";
import { getPlans } from "./plans.service.js";

export const plansRoutes: FastifyPluginAsync = async (app) => {
  const env = loadEnv();

  app.get("/public/plans", async (_request, reply) => {
    if (!env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ error: { code: "SERVICE_UNAVAILABLE", message: "Stripe not configured." } });
    }
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const plans = await getPlans(stripe, env);
    return reply.send(plans);
  });
};
