import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { findCustomerByClerkUserId } from "../customers/customers.service.js";
import { findProductByKey, listActiveProducts } from "../products/products.service.js";
import { evaluateEntitlementAccess } from "./access.service.js";
import type { AccessEntitlement, AccessProduct } from "./access.types.js";

const accessCheckQuerySchema = z.object({
  product_key: z.string().min(1)
});

export const accessRoutes: FastifyPluginAsync = async (app) => {
  app.get("/access-check", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const query = accessCheckQuerySchema.parse(request.query);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const product = await findProductByKey(app.prisma, query.product_key);
    const workspaceMembership = customer
      ? await app.prisma.workspaceMember.findFirst({
          where: {
            customerId: customer.id,
            status: "active",
            workspace: { status: "active" }
          },
          orderBy: { createdAt: "asc" },
          select: { workspaceId: true }
        })
      : null;
    const entitlement = workspaceMembership
      ? await app.prisma.entitlement.findUnique({
          where: {
            workspaceId_productKey: {
              workspaceId: workspaceMembership.workspaceId,
              productKey: query.product_key
            }
          }
        })
      : null;

    return evaluateEntitlementAccess({
      hasCustomer: Boolean(customer),
      product: product ? toAccessProduct(product) : null,
      entitlement: entitlement ? toAccessEntitlement(entitlement) : null,
      now: new Date()
    });
  });

  app.get("/me/products", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const customer = await findCustomerByClerkUserId(app.prisma, user.clerkUserId);
    const products = await listActiveProducts(app.prisma);
    const workspaceMembership = customer
      ? await app.prisma.workspaceMember.findFirst({
          where: {
            customerId: customer.id,
            status: "active",
            workspace: { status: "active" }
          },
          orderBy: { createdAt: "asc" },
          select: { workspaceId: true }
        })
      : null;
    const entitlements = workspaceMembership
      ? await app.prisma.entitlement.findMany({
          where: { workspaceId: workspaceMembership.workspaceId }
        })
      : [];
    const now = new Date();

    return {
      customer: customer
        ? { id: customer.id, email: customer.email, name: customer.name }
        : null,
      products: products.map((product) => {
        const entitlement = entitlements.find((item) => item.productKey === product.productKey);
        const decision = evaluateEntitlementAccess({
          hasCustomer: Boolean(customer),
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
          allowed: decision.allowed,
          reason: decision.reason
        };
      })
    };
  });
};

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

function toAccessEntitlement(entitlement: {
  productKey: string;
  status: string;
  plan: string;
  source: string;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
}): AccessEntitlement {
  return {
    productKey: entitlement.productKey,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    endsAt: entitlement.endsAt,
    trialEndsAt: entitlement.trialEndsAt,
    currentPeriodEndsAt: entitlement.currentPeriodEndsAt,
    limits: entitlement.limits
  };
}
