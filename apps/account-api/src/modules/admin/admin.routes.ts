import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@prisma/client";
import { loadEnv } from "../../env.js";
import { assertAdminEmail, parseAdminEmails } from "../auth/admin.js";
import {
  blockEntitlementSchema,
  customerParamsSchema,
  listCustomersQuerySchema,
  trialEntitlementSchema,
  upsertEntitlementSchema
} from "./admin.schemas.js";
import {
  blockEntitlement,
  grantTrialEntitlement,
  upsertEntitlement
} from "../entitlements/entitlements.service.js";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminEmails = parseAdminEmails(loadEnv().ADMIN_EMAILS);

  async function requireAdmin(authorization: string | undefined) {
    const user = await app.authVerifier.verifyBearerToken(authorization);
    assertAdminEmail(user.email, adminEmails);
    return user;
  }

  app.get("/admin/customers", async (request) => {
    await requireAdmin(request.headers.authorization);
    const query = listCustomersQuerySchema.parse(request.query);

    const customers = await app.prisma.customer.findMany({
      ...(query.search
        ? {
            where: {
              OR: [
                { email: { contains: query.search, mode: "insensitive" } },
                { name: { contains: query.search, mode: "insensitive" } }
              ]
            }
          }
        : {}),
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { customers };
  });

  app.get("/admin/customers/:id", async (request) => {
    await requireAdmin(request.headers.authorization);
    const params = customerParamsSchema.parse(request.params);

    const customer = await app.prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        entitlements: true,
        subscriptions: true
      }
    });

    const audit_logs = await app.prisma.auditLog.findMany({
      where: { targetId: params.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return { customer, audit_logs };
  });

  app.post("/admin/entitlements", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = upsertEntitlementSchema.parse(request.body);

    const entitlement = await upsertEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      status: input.status,
      plan: input.plan,
      source: input.source,
      endsAt: input.ends_at ? new Date(input.ends_at) : null,
      trialEndsAt: input.trial_ends_at ? new Date(input.trial_ends_at) : null,
      currentPeriodEndsAt: input.current_period_ends_at
        ? new Date(input.current_period_ends_at)
        : null,
      limits: input.limits as Prisma.InputJsonValue,
      metadata: input.metadata as Prisma.InputJsonValue
    });

    return { entitlement };
  });

  app.post("/admin/entitlements/block", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = blockEntitlementSchema.parse(request.body);
    const entitlement = await blockEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      reason: input.reason
    });

    return { entitlement };
  });

  app.post("/admin/entitlements/trial", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = trialEntitlementSchema.parse(request.body);
    const entitlement = await grantTrialEntitlement(app.prisma, user, {
      customerId: input.customer_id,
      productKey: input.product_key,
      plan: input.plan,
      trialDays: input.trial_days
    });

    return { entitlement };
  });
};
