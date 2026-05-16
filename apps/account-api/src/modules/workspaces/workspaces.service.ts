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

export async function ensureDefaultWorkspaceForCustomer(
  prisma: WorkspacePrisma,
  customer: CustomerIdentity
) {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      customerId: customer.id,
      status: "active",
      workspace: { status: "active" }
    },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (existingMembership) {
    return {
      workspace: existingMembership.workspace,
      membership: existingMembership
    };
  }

  const name = defaultWorkspaceName(customer);
  const workspace = await prisma.workspace.create({
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

  const membership = workspace.members.find((item) => item.customerId === customer.id);
  if (!membership) {
    throw new Error("Default workspace membership was not created.");
  }

  return { workspace, membership };
}
