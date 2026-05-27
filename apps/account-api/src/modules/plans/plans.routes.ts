import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { loadEnv } from "../../env.js";
import { getPlans } from "./plans.service.js";

export const plansRoutes: FastifyPluginAsync = async (app) => {
  const env = loadEnv();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  app.get("/public/plans", async (_request, reply) => {
    const plans = await getPlans(stripe, env);
    return reply.send(plans);
  });
};
