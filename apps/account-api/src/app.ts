import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { loadEnv } from "./env.js";
import { ApiError, sendApiError } from "./lib/errors.js";
import { prismaPlugin } from "./plugins/prisma.js";

export async function buildApp() {
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
  await app.register(prismaPlugin);

  app.get("/health", async () => ({ ok: true }));

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

  return app;
}
