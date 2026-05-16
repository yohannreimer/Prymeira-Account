import type { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app.js";
import type { AuthVerifier } from "../src/modules/auth/types.js";

export async function buildTestApp(authVerifier: AuthVerifier, prisma?: PrismaClient) {
  return buildApp({ authVerifier, prisma });
}
