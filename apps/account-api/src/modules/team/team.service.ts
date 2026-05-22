import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../lib/errors.js";
import { addDays } from "../../lib/time.js";
import type { AuthenticatedUser } from "../auth/types.js";

type TeamPrisma = PrismaClient | Prisma.TransactionClient;

type ProductRole = "admin" | "member";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseProductKeys(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function requireProductTeamAdmin(
  prisma: TeamPrisma,
  user: AuthenticatedUser,
  productKey: string
) {
  const customer = await prisma.customer.findUnique({
    where: { clerkUserId: user.clerkUserId }
  });
  if (!customer) {
    throw new ApiError(403, "FORBIDDEN", "Product admin access is required.");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      customerId: customer.id,
      status: "active",
      workspace: { status: "active" }
    },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });

  if (!membership) {
    throw new ApiError(403, "FORBIDDEN", "Product admin access is required.");
  }

  const productSeat = await prisma.workspaceProductMember.findUnique({
    where: {
      workspaceId_customerId_productKey: {
        workspaceId: membership.workspaceId,
        customerId: customer.id,
        productKey
      }
    }
  });

  const isAdmin =
    membership.role === "owner" ||
    productSeat?.role === "owner" ||
    productSeat?.role === "admin";

  if (!productSeat || productSeat.status !== "active" || !isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Product admin access is required.");
  }

  return { customer, membership, productSeat };
}

export async function listProductTeam(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  productKey: string
) {
  const { membership } = await requireProductTeamAdmin(prisma, user, productKey);

  const [members, invitations] = await Promise.all([
    prisma.workspaceProductMember.findMany({
      where: {
        workspaceId: membership.workspaceId,
        productKey
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: {
          select: {
            id: true,
            clerkUserId: true,
            email: true,
            name: true
          }
        }
      }
    }),
    prisma.invitation.findMany({
      where: {
        workspaceId: membership.workspaceId,
        status: "pending"
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return {
    members: members.map((member) => ({
      customer_id: member.customerId,
      clerk_user_id: member.customer.clerkUserId,
      email: member.customer.email,
      name: member.customer.name,
      product_key: member.productKey,
      role: member.role,
      status: member.status,
      created_at: member.createdAt
    })),
    invitations: invitations
      .filter((invitation) => parseProductKeys(invitation.productKeys).includes(productKey))
      .map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        product_keys: parseProductKeys(invitation.productKeys),
        expires_at: invitation.expiresAt,
        created_at: invitation.createdAt
      }))
  };
}

export async function inviteProductMember(
  prisma: PrismaClient,
  actor: AuthenticatedUser,
  input: {
    email: string;
    name?: string;
    role: ProductRole;
    productKey: string;
  }
) {
  const { membership } = await requireProductTeamAdmin(prisma, actor, input.productKey);
  const email = normalizeEmail(input.email);

  const product = await prisma.product.findUnique({
    where: { productKey: input.productKey },
    select: { productKey: true }
  });
  if (!product) {
    throw new ApiError(404, "NOT_FOUND", "Product not found.");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" } }
  });

  if (existingCustomer) {
    const member = await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.upsert({
        where: {
          workspaceId_customerId: {
            workspaceId: membership.workspaceId,
            customerId: existingCustomer.id
          }
        },
        update: { role: "member", status: "active" },
        create: {
          workspaceId: membership.workspaceId,
          customerId: existingCustomer.id,
          role: "member",
          status: "active"
        }
      });

      const productMember = await tx.workspaceProductMember.upsert({
        where: {
          workspaceId_customerId_productKey: {
            workspaceId: membership.workspaceId,
            customerId: existingCustomer.id,
            productKey: input.productKey
          }
        },
        update: { role: input.role, status: "active" },
        create: {
          workspaceId: membership.workspaceId,
          customerId: existingCustomer.id,
          productKey: input.productKey,
          role: input.role,
          status: "active"
        }
      });

      await tx.auditLog.create({
        data: {
          actorClerkUserId: actor.clerkUserId,
          action: "team.member_grant",
          targetType: "workspace_product_member",
          targetId: productMember.id,
          after: JSON.parse(JSON.stringify(productMember)) as Prisma.InputJsonValue
        }
      });

      return productMember;
    });

    return { status: "active", member };
  }

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId: membership.workspaceId,
      email,
      role: input.role,
      productKeys: [input.productKey],
      status: "pending",
      expiresAt: addDays(new Date(), 30)
    }
  });

  await prisma.auditLog.create({
    data: {
      actorClerkUserId: actor.clerkUserId,
      action: "team.invitation_create",
      targetType: "invitation",
      targetId: invitation.id,
      after: JSON.parse(JSON.stringify(invitation)) as Prisma.InputJsonValue
    }
  });

  return { status: "pending", invitation };
}

export async function updateProductMember(
  prisma: PrismaClient,
  actor: AuthenticatedUser,
  input: {
    customerId: string;
    productKey: string;
    role?: ProductRole;
    status?: "active" | "disabled";
  }
) {
  const { customer, membership } = await requireProductTeamAdmin(prisma, actor, input.productKey);
  if (customer.id === input.customerId && input.status === "disabled") {
    throw new ApiError(400, "VALIDATION_ERROR", "You cannot disable your own access.");
  }

  const where = {
    workspaceId_customerId_productKey: {
      workspaceId: membership.workspaceId,
      customerId: input.customerId,
      productKey: input.productKey
    }
  };
  const before = await prisma.workspaceProductMember.findUnique({ where });
  if (!before) {
    throw new ApiError(404, "NOT_FOUND", "Product member not found.");
  }

  const member = await prisma.workspaceProductMember.update({
    where,
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {})
    }
  });

  await prisma.auditLog.create({
    data: {
      actorClerkUserId: actor.clerkUserId,
      action: "team.member_update",
      targetType: "workspace_product_member",
      targetId: member.id,
      before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
      after: JSON.parse(JSON.stringify(member)) as Prisma.InputJsonValue
    }
  });

  return member;
}

export async function acceptPendingInvitationsForCustomer(
  prisma: PrismaClient,
  customer: { id: string; email: string }
) {
  if (!("invitation" in prisma)) return;
  const now = new Date();
  const invitations = await prisma.invitation.findMany({
    where: {
      email: { equals: customer.email, mode: "insensitive" },
      status: "pending",
      expiresAt: { gt: now }
    },
    orderBy: { createdAt: "asc" }
  });

  if (!invitations.length) return;

  await prisma.$transaction(async (tx) => {
    for (const invitation of invitations) {
      await tx.workspaceMember.upsert({
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

      for (const productKey of parseProductKeys(invitation.productKeys)) {
        await tx.workspaceProductMember.upsert({
          where: {
            workspaceId_customerId_productKey: {
              workspaceId: invitation.workspaceId,
              customerId: customer.id,
              productKey
            }
          },
          update: { role: invitation.role, status: "active" },
          create: {
            workspaceId: invitation.workspaceId,
            customerId: customer.id,
            productKey,
            role: invitation.role,
            status: "active"
          }
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" }
      });
    }
  });
}
