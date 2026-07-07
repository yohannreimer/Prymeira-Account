import type { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { isDemoMode, loadEnv } from "../../env.js";
import { ensureCustomerForAuthenticatedUser } from "../customers/customers.service.js";
import { demoAccessDecision, demoProductsResponse } from "../demo/demo-fixtures.js";
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
  const env = loadEnv();

  app.get("/access-check", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const query = accessCheckQuerySchema.parse(request.query);

    if (isDemoMode(env)) {
      return demoAccessDecision(env, query.product_key);
    }

    const { customer } = await ensureCustomerForAuthenticatedUser(app.prisma, user);
    const product = await findProductByKey(app.prisma, query.product_key);
    const workspaceContext = await findAccessWorkspaceMembership(app.prisma, customer.id, query.product_key);
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

    if (isDemoMode(env)) {
      return demoProductsResponse(env);
    }

    const { customer } = await ensureCustomerForAuthenticatedUser(app.prisma, user);
    const products = await listActiveProducts(app.prisma);
    const workspaceContext = await findAccessWorkspaceMembership(app.prisma, customer.id);
    const now = new Date();
    const productViews = await Promise.all(
      products.map(async (product) => {
        const productWorkspaceContext = await findAccessWorkspaceMembership(
          app.prisma,
          customer.id,
          product.productKey
        );
        const activeWorkspaceId =
          productWorkspaceContext.membership?.status === "active" &&
          productWorkspaceContext.membership.workspace.status === "active"
            ? productWorkspaceContext.membership.workspaceId
            : null;
        const [entitlement, productSeat] = activeWorkspaceId
          ? await Promise.all([
              app.prisma.entitlement.findUnique({
                where: {
                  workspaceId_productKey: {
                    workspaceId: activeWorkspaceId,
                    productKey: product.productKey
                  }
                }
              }),
              app.prisma.workspaceProductMember.findUnique({
                where: {
                  workspaceId_customerId_productKey: {
                    workspaceId: activeWorkspaceId,
                    customerId: customer!.id,
                    productKey: product.productKey
                  }
                }
              })
            ])
          : [null, null];
        const decision = evaluateEntitlementAccess({
          hasCustomer: Boolean(customer),
          workspace: productWorkspaceContext.membership ? toAccessWorkspace(productWorkspaceContext.membership) : null,
          workspaceMissingReason: productWorkspaceContext.missingReason,
          productSeat: productSeat ? toAccessProductSeat(productSeat) : null,
          product: toAccessProduct(product),
          entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
          now
        });

        return { decision, product, workspaceContext: productWorkspaceContext };
      })
    );
    const primaryMembership =
      productViews.find((item) => item.decision.allowed && item.workspaceContext.membership)?.workspaceContext.membership ??
      workspaceContext.membership;

    return {
      customer: customer
        ? { id: customer.id, email: customer.email, name: customer.name }
        : null,
      workspace: primaryMembership
        ? {
            id: primaryMembership.workspace.id,
            name: primaryMembership.workspace.name,
            type: primaryMembership.workspace.type,
            role: primaryMembership.role
          }
        : null,
      products: productViews.map(({ decision, product }) => {
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
