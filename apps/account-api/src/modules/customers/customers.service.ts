import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";
import type { z } from "zod";
import type { syncCustomerSchema } from "./customers.schemas.js";

type SyncCustomerInput = z.infer<typeof syncCustomerSchema>;

export async function syncCustomer(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  input: SyncCustomerInput
) {
  if (input.clerk_user_id !== user.clerkUserId) {
    throw new ApiError(403, "FORBIDDEN", "Cannot sync a different Clerk user.");
  }

  const name = input.name ?? user.name ?? null;

  return prisma.customer.upsert({
    where: { clerkUserId: user.clerkUserId },
    update: {
      email: input.email,
      name
    },
    create: {
      clerkUserId: user.clerkUserId,
      email: input.email,
      name
    }
  });
}

export async function findCustomerByClerkUserId(prisma: PrismaClient, clerkUserId: string) {
  return prisma.customer.findUnique({
    where: { clerkUserId }
  });
}
