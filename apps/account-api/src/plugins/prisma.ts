import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

type PrismaPluginOptions = {
  prisma?: PrismaClient;
  connect?: boolean;
  disconnectOnClose?: boolean;
};

export const prismaPlugin = fp<PrismaPluginOptions>(async (app, options) => {
  const prisma = options.prisma ?? new PrismaClient();
  const connect = options.connect ?? true;
  const disconnectOnClose = options.disconnectOnClose ?? true;

  app.decorate("prisma", prisma);

  if (disconnectOnClose) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  if (connect) {
    await prisma.$connect();
  }
});
