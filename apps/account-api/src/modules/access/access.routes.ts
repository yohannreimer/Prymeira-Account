import type { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { findProductByKey, listActiveProducts } from "../products/products.service.js";
import { evaluateEntitlementAccess } from "./access.service.js";
import type {
  AccessEntitlement,
  AccessProduct,
  AccessProductSeat,
  AccessReason,
  AccessWorkspace
} from "./access.types.js";

const accessCheckQuerySchema = z.object({
  product_key: z.string().min(1)
});

export const accessRoutes: FastifyPluginAsync = async (app) => {
  app.get("/access-check", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const query = accessCheckQuerySchema.parse(request.query);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const product = await findProductByKey(app.prisma, query.product_key);
    const workspaceContext = customer
      ? await findAccessWorkspaceMembership(app.prisma, customer.id, query.product_key)
      : { membership: null, missingReason: "no_workspace" as const };
    const activeWorkspaceId =
      workspaceContext.membership?.status === "active" && workspaceContext.membership.workspace.status === "active"
        ? workspaceContext.membership.workspaceId
        : null;
    const entitlement = activeWorkspaceId
      ? await app.prisma.entitlement.findUnique({
          where: {
            workspaceId_productKey: {
              workspaceId: activeWorkspaceId,
              productKey: query.product_key
            }
          }
        })
      : null;
    const productSeat = activeWorkspaceId
      ? await app.prisma.workspaceProductMember.findUnique({
          where: {
            workspaceId_customerId_productKey: {
              workspaceId: activeWorkspaceId,
              customerId: customer!.id,
              productKey: query.product_key
            }
          }
        })
      : null;

    return evaluateEntitlementAccess({
      hasCustomer: Boolean(customer),
      workspace: workspaceContext.membership ? toAccessWorkspace(workspaceContext.membership) : null,
      workspaceMissingReason: workspaceContext.missingReason,
      productSeat: productSeat ? toAccessProductSeat(productSeat) : null,
      product: product ? toAccessProduct(product) : null,
      entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
      now: new Date()
    });
  });

  app.get("/me/products", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const products = await listActiveProducts(app.prisma);
    const workspaceContext = customer
      ? await findAccessWorkspaceMembership(app.prisma, customer.id)
      : { membership: null, missingReason: "no_workspace" as const };
    const activeWorkspaceId =
      workspaceContext.membership?.status === "active" && workspaceContext.membership.workspace.status === "active"
        ? workspaceContext.membership.workspaceId
        : null;
    const entitlements = activeWorkspaceId
      ? await app.prisma.entitlement.findMany({
          where: { workspaceId: activeWorkspaceId }
        })
      : [];
    const productSeats = activeWorkspaceId
      ? await app.prisma.workspaceProductMember.findMany({
          where: {
            workspaceId: activeWorkspaceId,
            customerId: customer!.id,
            productKey: { in: products.map((product) => product.productKey) }
          }
        })
      : [];
    const now = new Date();

    return {
      customer: customer
        ? { id: customer.id, email: customer.email, name: customer.name }
        : null,
      workspace: workspaceContext.membership
        ? {
            id: workspaceContext.membership.workspace.id,
            name: workspaceContext.membership.workspace.name,
            type: workspaceContext.membership.workspace.type,
            role: workspaceContext.membership.role
          }
        : null,
      products: products.map((product) => {
        const entitlement = entitlements.find((item) => item.productKey === product.productKey);
        const productSeat = productSeats.find((item) => item.productKey === product.productKey);
        const decision = evaluateEntitlementAccess({
          hasCustomer: Boolean(customer),
          workspace: workspaceContext.membership ? toAccessWorkspace(workspaceContext.membership) : null,
          workspaceMissingReason: workspaceContext.missingReason,
          productSeat: productSeat ? toAccessProductSeat(productSeat) : null,
          product: toAccessProduct(product),
          entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
          now
        });

        return {
          product_key: product.productKey,
          name: product.name,
          description: product.description,
          app_url: product.appUrl,
          marketing_url: product.marketingUrl,
          status: decision.allowed ? decision.status : "locked",
          plan: decision.plan,
          source: decision.source,
          limits: decision.limits,
          seats_limit: decision.seats_limit,
          workspace_id: decision.workspace_id,
          workspace_role: decision.workspace_role,
          product_role: decision.product_role,
          allowed: decision.allowed,
          reason: decision.reason,
          upgrade_url: decision.upgrade_url
        };
      })
    };
  });
};

type WorkspaceMembershipWithWorkspace = {
  workspaceId: string;
  role: string;
  status: string;
  workspace: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
};

type WorkspaceLookupResult = {
  membership: WorkspaceMembershipWithWorkspace | null;
  missingReason: Extract<AccessReason, "no_workspace" | "no_workspace_membership">;
};

async function findAccessWorkspaceMembership(
  prisma: Pick<PrismaClient, "workspaceMember"> & Partial<Pick<PrismaClient, "workspaceProductMember">>,
  customerId: string,
  productKey?: string
): Promise<WorkspaceLookupResult> {
  if (productKey && prisma.workspaceProductMember?.findFirst) {
    const productSeat = await prisma.workspaceProductMember.findFirst({
      where: {
        customerId,
        productKey,
        status: "active",
        workspace: { status: "active" }
      },
      orderBy: { createdAt: "asc" }
    });

    if (productSeat) {
      const productMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_customerId: {
            workspaceId: productSeat.workspaceId,
            customerId
          }
        },
        include: { workspace: true }
      });

      if (productMembership?.status === "active") {
        return { membership: productMembership, missingReason: "no_workspace" };
      }
    }
  }

  const activeMembership = await prisma.workspaceMember.findFirst({
    where: {
      customerId,
      status: "active",
      workspace: { status: "active" }
    },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });

  if (activeMembership) {
    return { membership: activeMembership, missingReason: "no_workspace" };
  }

  const activeMembershipWithInactiveWorkspace = await prisma.workspaceMember.findFirst({
    where: {
      customerId,
      status: "active"
    },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });

  if (activeMembershipWithInactiveWorkspace) {
    return { membership: activeMembershipWithInactiveWorkspace, missingReason: "no_workspace" };
  }

  const anyMembership = await prisma.workspaceMember.findFirst({
    where: { customerId },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });

  return {
    membership: null,
    missingReason: anyMembership ? "no_workspace_membership" : "no_workspace"
  };
}

function toAccessProduct(product: {
  productKey: string;
  status: string;
  marketingUrl: string | null;
}): AccessProduct {
  return {
    productKey: product.productKey,
    status: product.status,
    marketingUrl: product.marketingUrl
  };
}

function toAccessWorkspace(membership: WorkspaceMembershipWithWorkspace): AccessWorkspace {
  return {
    id: membership.workspace.id,
    status: membership.workspace.status,
    role: membership.role
  };
}

function toAccessProductSeat(productSeat: {
  workspaceId: string;
  customerId: string;
  productKey: string;
  role: string;
  status: string;
}): AccessProductSeat {
  return {
    workspaceId: productSeat.workspaceId,
    customerId: productSeat.customerId,
    productKey: productSeat.productKey,
    role: productSeat.role,
    status: productSeat.status
  };
}

function toAccessEntitlement(entitlement: {
  workspaceId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit: number;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
}): AccessEntitlement {
  return {
    workspaceId: entitlement.workspaceId,
    productKey: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    seatsLimit: entitlement.seatsLimit,
    endsAt: entitlement.endsAt,
    trialEndsAt: entitlement.trialEndsAt,
    currentPeriodEndsAt: entitlement.currentPeriodEndsAt,
    limits: entitlement.limits
  };
}
