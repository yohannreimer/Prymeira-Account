import Fastify from "fastify";
import cors from "@fastify/cors";
import type { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { isDemoMode, loadEnv } from "./env.js";
import { ApiError, sendApiError } from "./lib/errors.js";
import { accessRoutes } from "./modules/access/access.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { createClerkAuthVerifier } from "./modules/auth/clerk.js";
import { createDemoAuthVerifier } from "./modules/auth/demo.js";
import type { AuthVerifier } from "./modules/auth/types.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";
import { customersRoutes } from "./modules/customers/customers.routes.js";
import { plansRoutes } from "./modules/plans/plans.routes.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { teamRoutes } from "./modules/team/team.routes.js";
import { webhookRoutes } from "./modules/webhook/webhook.routes.js";

declare module "fastify" {
  interface FastifyInstance {
    authVerifier: AuthVerifier;
  }
}

type BuildAppOptions = {
  authVerifier?: AuthVerifier;
  prisma?: PrismaClient;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const env = loadEnv();
  const allowedCorsOrigins = new Set(
    env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"), false);
    }
  });
  await app.register(
    prismaPlugin,
    options.prisma
      ? { prisma: options.prisma, connect: false, disconnectOnClose: false }
      : isDemoMode(env)
        ? { connect: false }
        : {}
  );

  app.decorate("authVerifier", options.authVerifier ?? (isDemoMode(env) ? createDemoAuthVerifier(env) : createClerkAuthVerifier()));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return sendApiError(reply, error);
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues.map((issue) => issue.message).join("; ")
        }
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      }
    });
  });

  app.get("/health", async () => ({ ok: true }));
  app.get("/public/config", async () => ({
    clerk_publishable_key: env.CLERK_PUBLISHABLE_KEY ?? ""
  }));

  await app.register(customersRoutes);
  await app.register(accessRoutes);
  await app.register(adminRoutes);
  await app.register(teamRoutes);
  await app.register(checkoutRoutes);
  await app.register(plansRoutes);
  await app.register(webhookRoutes);

  return app;
}
