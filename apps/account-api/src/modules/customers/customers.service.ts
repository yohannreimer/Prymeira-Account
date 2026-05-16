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

  if (input.email !== user.email) {
    throw new ApiError(403, "FORBIDDEN", "Cannot sync a different email.");
  }

  const nextName = input.name ?? user.name;
  const update = {
    email: user.email,
    ...(nextName !== undefined ? { name: nextName } : {})
  };

  return prisma.customer.upsert({
    where: { clerkUserId: user.clerkUserId },
    update,
    create: {
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: nextName ?? null
    }
  });
}

export async function findCustomerByClerkUserId(prisma: PrismaClient, clerkUserId: string) {
  return prisma.customer.findUnique({
    where: { clerkUserId }
  });
}
