import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  defaultWorkspaceName,
  ensureDefaultWorkspaceForCustomer
} from "./workspaces.service.js";

const customer = {
  id: "9f7dd4f9-cf5f-4f9a-8366-7c4b9cfd79b0",
  email: "user@example.com",
  name: "  Acme Inc  "
};

describe("defaultWorkspaceName", () => {
  it("uses a trimmed customer name when present", () => {
    expect(defaultWorkspaceName(customer)).toBe("Acme Inc");
  });

  it("falls back to the email prefix and then a generic name", () => {
    expect(defaultWorkspaceName({ ...customer, name: null })).toBe("user");
    expect(defaultWorkspaceName({ ...customer, email: "", name: null })).toBe("Workspace");
  });
});

describe("ensureDefaultWorkspaceForCustomer", () => {
  it("reuses the first active workspace membership for an active workspace", async () => {
    const workspace = {
      id: "workspace_existing",
      name: "Existing Workspace",
      type: "team",
      status: "active"
    };
    const membership = {
      id: "member_existing",
      customerId: customer.id,
      workspaceId: workspace.id,
      role: "member",
      status: "active",
      workspace
    };
    let findFirstArgs: unknown;
    const prisma = {
      workspaceMember: {
        findFirst(args: unknown) {
          findFirstArgs = args;
          return membership;
        }
      },
      workspace: {
        create() {
          throw new Error("workspace should not be created when membership exists");
        }
      }
    } as unknown as PrismaClient;

    const result = await ensureDefaultWorkspaceForCustomer(prisma, customer);

    expect(findFirstArgs).toMatchObject({
      where: {
        customerId: customer.id,
        status: "active",
        workspace: { status: "active" }
      },
      include: { workspace: true },
      orderBy: { createdAt: "asc" }
    });
    expect(result).toEqual({ workspace, membership });
  });

  it("creates an individual workspace and owner membership when none exists", async () => {
    let createArgs: unknown;
    const prisma = {
      workspaceMember: {
        findFirst() {
          return null;
        }
      },
      workspace: {
        create(args: unknown) {
          createArgs = args;
          return {
            id: "workspace_new",
            name: "Acme Inc",
            slug: "acme-inc-9f7dd4f9",
            type: "individual",
            status: "active",
            ownerCustomerId: customer.id,
            members: [
              {
                id: "member_new",
                customerId: customer.id,
                workspaceId: "workspace_new",
                role: "owner",
                status: "active"
              }
            ]
          };
        }
      }
    } as unknown as PrismaClient;

    const result = await ensureDefaultWorkspaceForCustomer(prisma, customer);

    expect(createArgs).toMatchObject({
      data: {
        name: "Acme Inc",
        slug: "acme-inc-9f7dd4f9",
        type: "individual",
        status: "active",
        ownerCustomerId: customer.id,
        members: {
          create: {
            customerId: customer.id,
            role: "owner",
            status: "active"
          }
        }
      },
      include: { members: true }
    });
    expect(result.workspace).toMatchObject({
      id: "workspace_new",
      name: "Acme Inc",
      type: "individual"
    });
    expect(result.membership).toMatchObject({
      id: "member_new",
      customerId: customer.id,
      role: "owner"
    });
  });

  it("re-reads the active membership when concurrent creation hits a unique slug conflict", async () => {
    const workspace = {
      id: "workspace_existing",
      name: "Acme Inc",
      type: "individual",
      status: "active"
    };
    const membership = {
      id: "member_existing",
      customerId: customer.id,
      workspaceId: workspace.id,
      role: "owner",
      status: "active",
      workspace
    };
    let findFirstCount = 0;
    const prisma = {
      workspaceMember: {
        findFirst() {
          findFirstCount += 1;
          return findFirstCount === 1 ? null : membership;
        }
      },
      workspace: {
        create() {
          const error = new Error("Unique constraint failed on the fields: (`slug`)");
          Object.assign(error, { code: "P2002" });
          throw error;
        }
      }
    } as unknown as PrismaClient;

    const result = await ensureDefaultWorkspaceForCustomer(prisma, customer);

    expect(findFirstCount).toBe(2);
    expect(result).toEqual({ workspace, membership });
  });
});
