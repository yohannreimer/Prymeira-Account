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
        subscriptions: true,
        workspaceMembers: {
          where: {
            status: "active",
            workspace: { status: "active" }
          },
          include: {
            workspace: {
              include: {
                entitlements: true,
                members: { include: { customer: true } },
                productMembers: true
              }
            }
          }
        }
      }
    });
    const workspaceEntitlements = Array.from(
      new Map(
        customer?.workspaceMembers
          .flatMap((membership) => membership.workspace.entitlements)
          .map((entitlement) => [entitlement.id, entitlement]) ?? []
      ).values()
    );
    const workspaces = Array.from(
      new Map(
        customer?.workspaceMembers.map((membership) => [
          membership.workspace.id,
          membership.workspace
        ]) ?? []
      ).values()
    );
    const responseCustomer = customer
      ? (({ workspaceMembers: _workspaceMembers, ...customerFields }) => ({
          ...customerFields,
          workspaces,
          entitlements: workspaceEntitlements
        }))(customer)
      : null;

    const auditTargetIds = [params.id, ...workspaceEntitlements.map((entitlement) => entitlement.id)];
    const audit_logs = await app.prisma.auditLog.findMany({
      where: { targetId: { in: auditTargetIds } },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return { customer: responseCustomer, audit_logs };
  });

  app.post("/admin/entitlements", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = upsertEntitlementSchema.parse(request.body);
    const toNullableDate = (value: string | null | undefined) =>
      value == null ? null : new Date(value);

    const entitlementInput: {
      workspaceId: string;
      productKey: string;
      status: string;
      plan: string;
      source: string;
      seatsLimit?: number;
      endsAt?: Date | null;
      trialEndsAt?: Date | null;
      currentPeriodEndsAt?: Date | null;
      limits: Prisma.InputJsonValue;
      metadata: Prisma.InputJsonValue;
    } = {
      workspaceId: input.workspace_id,
      productKey: input.product_key,
      status: input.status,
      plan: input.plan,
      source: input.source,
      limits: input.limits as Prisma.InputJsonValue,
      metadata: input.metadata as Prisma.InputJsonValue
    };

    if (input.seats_limit !== undefined) {
      entitlementInput.seatsLimit = input.seats_limit;
    }

    if (Object.prototype.hasOwnProperty.call(input, "ends_at")) {
      entitlementInput.endsAt = toNullableDate(input.ends_at);
    }
    if (Object.prototype.hasOwnProperty.call(input, "trial_ends_at")) {
      entitlementInput.trialEndsAt = toNullableDate(input.trial_ends_at);
    }
    if (Object.prototype.hasOwnProperty.call(input, "current_period_ends_at")) {
      entitlementInput.currentPeriodEndsAt = toNullableDate(input.current_period_ends_at);
    }

    const entitlement = await upsertEntitlement(app.prisma, user, entitlementInput);

    return { entitlement };
  });

  app.post("/admin/entitlements/block", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = blockEntitlementSchema.parse(request.body);
    const entitlement = await blockEntitlement(app.prisma, user, {
      workspaceId: input.workspace_id,
      productKey: input.product_key,
      reason: input.reason
    });

    return { entitlement };
  });

  app.post("/admin/entitlements/trial", async (request) => {
    const user = await requireAdmin(request.headers.authorization);
    const input = trialEntitlementSchema.parse(request.body);
    const entitlement = await grantTrialEntitlement(app.prisma, user, {
      workspaceId: input.workspace_id,
      productKey: input.product_key,
      plan: input.plan,
      trialDays: input.trial_days
    });

    return { entitlement };
  });
};
