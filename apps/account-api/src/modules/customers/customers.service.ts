import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";
import { ensureDefaultWorkspaceForCustomer } from "../workspaces/workspaces.service.js";
import type { z } from "zod";
import type { syncCustomerSchema } from "./customers.schemas.js";
import { acceptPendingInvitationsForCustomer } from "../team/team.service.js";

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

  const customer = await prisma.customer.upsert({
    where: { clerkUserId: user.clerkUserId },
    update,
    create: {
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: nextName ?? null
    }
  });
  await acceptPendingInvitationsForCustomer(prisma, customer);
  const workspaceContext = await ensureDefaultWorkspaceForCustomer(prisma, customer);

  return { customer, workspaceContext };
}

export async function ensureCustomerForAuthenticatedUser(
  prisma: PrismaClient,
  user: AuthenticatedUser
) {
  const existingCustomer = await findCustomerByClerkUserId(prisma, user.clerkUserId);
  if (existingCustomer) {
    await acceptPendingInvitationsForCustomer(prisma, existingCustomer);
    return { customer: existingCustomer };
  }

  const input = {
    clerk_user_id: user.clerkUserId,
    email: user.email,
    ...(user.name ? { name: user.name } : {})
  };

  return syncCustomer(prisma, user, input);
}

export async function findCustomerByClerkUserId(prisma: PrismaClient, clerkUserId: string) {
  return prisma.customer.findUnique({
    where: { clerkUserId }
  });
}
