import type { Prisma, PrismaClient } from "@prisma/client";

type WorkspacePrisma = PrismaClient | Prisma.TransactionClient;

type CustomerIdentity = {
  id: string;
  email: string;
  name: string | null;
};

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export function defaultWorkspaceName(customer: CustomerIdentity) {
  return customer.name?.trim() || customer.email.split("@")[0] || "Workspace";
}

async function findActiveWorkspaceMembership(prisma: WorkspacePrisma, customerId: string) {
  return prisma.workspaceMember.findFirst({
    where: {
      customerId,
      status: "active",
      workspace: { status: "active" }
    },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function workspaceContextFromMembership(
  membership: NonNullable<Awaited<ReturnType<typeof findActiveWorkspaceMembership>>>
) {
  return {
    workspace: membership.workspace,
    membership
  };
}

export async function ensureDefaultWorkspaceForCustomer(
  prisma: WorkspacePrisma,
  customer: CustomerIdentity
) {
  const existingMembership = await findActiveWorkspaceMembership(prisma, customer.id);

  if (existingMembership) {
    return workspaceContextFromMembership(existingMembership);
  }

  const name = defaultWorkspaceName(customer);
  let workspace;
  try {
    workspace = await prisma.workspace.create({
      data: {
        name,
        slug: `${slugify(name)}-${customer.id.slice(0, 8)}`,
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
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentMembership = await findActiveWorkspaceMembership(prisma, customer.id);
      if (concurrentMembership) {
        return workspaceContextFromMembership(concurrentMembership);
      }
    }

    throw error;
  }

  const membership = workspace.members.find((item) => item.customerId === customer.id);
  if (!membership) {
    throw new Error("Default workspace membership was not created.");
  }

  return { workspace, membership };
}
