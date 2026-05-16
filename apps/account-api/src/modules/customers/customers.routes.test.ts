import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createStaticAuthVerifier } from "../../../test/auth-fixtures.js";

const authVerifier = createStaticAuthVerifier({
  clerkUserId: "user_123",
  email: "user@example.com",
  name: "User"
});

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://example.test/account";
  process.env.CLERK_SECRET_KEY = "clerk_secret";
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
});

describe("customersRoutes", () => {
  it("returns the synced customer and default workspace context", async () => {
    const customer = {
      id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
      clerkUserId: "user_123",
      email: "user@example.com",
      name: "User"
    };
    const workspace = {
      id: "workspace_123",
      name: "User",
      type: "individual",
      status: "active"
    };
    const prisma = {
      customer: {
        upsert() {
          return customer;
        }
      },
      workspaceMember: {
        findFirst() {
          return {
            id: "member_123",
            customerId: customer.id,
            workspaceId: workspace.id,
            role: "owner",
            status: "active",
            workspace
          };
        }
      }
    } as unknown as PrismaClient;
    const app = await buildApp({ authVerifier, prisma });

    const response = await app.inject({
      method: "POST",
      url: "/customers/sync",
      headers: { authorization: "Bearer token" },
      payload: {
        clerk_user_id: "user_123",
        email: "user@example.com"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      customer_id: customer.id,
      clerk_user_id: customer.clerkUserId,
      email: customer.email,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        role: "owner"
      }
    });

    await app.close();
  });
});
