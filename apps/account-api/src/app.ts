import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { ApiError, sendApiError } from "./lib/errors.js";
import { prismaPlugin } from "./plugins/prisma.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);

  app.get("/health", async () => ({ ok: true }));

  app.setErrorHandler((error, _request, reply) => {
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

    requestLogError(reply, error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      }
    });
  });

  return app;
}

function requestLogError(reply: { log?: { error: (error: unknown) => void } }, error: unknown) {
  reply.log?.error(error);
}
