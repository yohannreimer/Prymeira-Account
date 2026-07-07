import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/types.js";
import { ensureCustomerForAuthenticatedUser, syncCustomer } from "./customers.service.js";

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

describe("ensureCustomerForAuthenticatedUser", () => {
  it("accepts pending invitations for an existing authenticated customer", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      clerkUserId: "user_123",
      email: "user@example.com",
      name: "User"
    };
    const invitation = {
      id: "8e5b3735-1a5d-48c2-84d2-3e8c64b62222",
      workspaceId: "c6fcda6d-c60b-4cf7-8548-9230fed8d8b4",
      email: "user@example.com",
      role: "member",
      productKeys: ["talk"],
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const tx = {
      workspaceMember: { upsert: vi.fn() },
      workspaceProductMember: { upsert: vi.fn() },
      invitation: { update: vi.fn() }
    };
    const prisma = {
      customer: {
        findUnique: vi.fn().mockResolvedValue(customer)
      },
      invitation: {
        findMany: vi.fn().mockResolvedValue([invitation])
      },
      $transaction: vi.fn(async (callback) => callback(tx))
    } as unknown as PrismaClient;

    const result = await ensureCustomerForAuthenticatedUser(prisma, {
      clerkUserId: "user_123",
      email: "user@example.com"
    });

    expect(result).toEqual({ customer });
    expect(tx.workspaceMember.upsert).toHaveBeenCalledWith({
      where: {
        workspaceId_customerId: {
          workspaceId: invitation.workspaceId,
          customerId: customer.id
        }
      },
      update: { role: "member", status: "active" },
      create: {
        workspaceId: invitation.workspaceId,
        customerId: customer.id,
        role: "member",
        status: "active"
      }
    });
    expect(tx.workspaceProductMember.upsert).toHaveBeenCalledWith({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId: invitation.workspaceId,
          customerId: customer.id,
          productKey: "talk"
        }
      },
      update: { role: invitation.role, status: "active" },
      create: {
        workspaceId: invitation.workspaceId,
        customerId: customer.id,
        productKey: "talk",
        role: invitation.role,
        status: "active"
      }
    });
    expect(tx.invitation.update).toHaveBeenCalledWith({
      where: { id: invitation.id },
      data: { status: "accepted" }
    });
  });
});
