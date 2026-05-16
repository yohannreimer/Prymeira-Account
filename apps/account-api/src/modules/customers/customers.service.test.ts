import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";
import { syncCustomer } from "./customers.service.js";

const user: AuthenticatedUser = {
  clerkUserId: "user_123",
  email: "user@example.com"
};

function prismaWithUpsert(upsert: (args: unknown) => unknown): PrismaClient {
  return {
    customer: {
      upsert
    },
    workspaceMember: {
      findFirst() {
        return {
          id: "member_123",
          customerId: "customer_123",
          workspaceId: "workspace_123",
          role: "owner",
          status: "active",
          workspace: {
            id: "workspace_123",
            name: "User",
            type: "individual",
            status: "active"
          }
        };
      }
    }
  } as unknown as PrismaClient;
}

describe("syncCustomer", () => {
  it("rejects syncing a different email than the authenticated user", async () => {
    const prisma = prismaWithUpsert(() => {
      throw new Error("upsert should not be called");
    });

    await expect(
      syncCustomer(prisma, user, {
        clerk_user_id: user.clerkUserId,
        email: "other@example.com"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "Cannot sync a different email."
    });
  });

  it("omits name on update when no input or authenticated user name exists", async () => {
    let upsertArgs: unknown;
    const prisma = prismaWithUpsert((args) => {
      upsertArgs = args;
      return { id: "customer_123", email: user.email, name: null };
    });

    const result = await syncCustomer(prisma, user, {
      clerk_user_id: user.clerkUserId,
      email: user.email
    });

    expect(upsertArgs).toMatchObject({
      update: {
        email: user.email
      },
      create: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: null
      }
    });
    expect((upsertArgs as { update: Record<string, unknown> }).update).not.toHaveProperty("name");
    expect(result.customer.email).toBe(user.email);
    expect(result.workspaceContext.workspace.id).toBe("workspace_123");
    expect(result.workspaceContext.membership.role).toBe("owner");
  });
});
