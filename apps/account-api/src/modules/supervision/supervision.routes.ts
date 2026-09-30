import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { isDemoMode, loadEnv } from "../../env.js";
import { ApiError } from "../../lib/errors.js";
import { assertAdminEmail, parseAdminEmails } from "../auth/admin.js";
import { channelCatalog, mySupervisionGrants, revokeGrant, saveGrant, sellerWorkspaces } from "./supervision.service.js";

const customerQuery = z.object({ seller_customer_id: z.string().uuid() });
const channelQuery = customerQuery.extend({ workspace_id: z.string().uuid() });
const grantSchema = channelQuery.extend({ supervisor_customer_id: z.string().uuid(), channel_id: z.string().uuid() });

export const supervisionRoutes: FastifyPluginAsync = async (app) => {
  const env = loadEnv();
  app.addHook("onRequest", async (_request, reply) => { reply.header("Cache-Control", "no-store"); });
  const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);
  async function admin(authorization: string | undefined, actionToken?: string | string[], mutation = false) {
    const user = await app.authVerifier.verifyBearerToken(authorization);
    assertAdminEmail(user.email, adminEmails);
    if (mutation && env.ADMIN_ACTION_TOKEN.trim() && actionToken !== env.ADMIN_ACTION_TOKEN.trim()) {
      throw new ApiError(403, "FORBIDDEN", "Valid admin action token is required.");
    }
    return user;
  }

  app.get("/me/talk-supervision", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    if (isDemoMode(env)) return { grants: [] };
    return mySupervisionGrants(app.prisma, user.clerkUserId);
  });
  app.get("/admin/talk-supervision/sources", async (request) => {
    await admin(request.headers.authorization);
    const query = customerQuery.parse(request.query);
    return { workspaces: await sellerWorkspaces(app.prisma, query.seller_customer_id) };
  });
  app.get("/admin/talk-supervision/channels", async (request) => {
    await admin(request.headers.authorization);
    const query = channelQuery.parse(request.query);
    return channelCatalog(app.prisma, query.seller_customer_id, query.workspace_id, request.headers.authorization!, env.TALK_API_URL);
  });
  app.get("/admin/talk-supervision/grants", async (request) => {
    await admin(request.headers.authorization);
    const query = z.object({ supervisor_customer_id: z.string().uuid() }).parse(request.query);
    const grants = await app.prisma.talkSupervisionGrant.findMany({
      where: { supervisorCustomerId: query.supervisor_customer_id },
      include: { seller: { select: { id: true, name: true, email: true } }, workspace: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    });
    return { grants };
  });
  app.post("/admin/talk-supervision/grants", async (request) => {
    const user = await admin(request.headers.authorization, request.headers["x-admin-action-token"], true);
    const input = grantSchema.parse(request.body);
    const catalog = await channelCatalog(app.prisma, input.seller_customer_id, input.workspace_id, request.headers.authorization!, env.TALK_API_URL);
    const channel = catalog.channels.find((channel) => channel.id === input.channel_id);
    if (!channel) {
      throw new ApiError(400, "INVALID_CHANNEL", "Escolha um canal existente neste workspace.");
    }
    const grant = await saveGrant(app.prisma, user.clerkUserId, {
      supervisorCustomerId: input.supervisor_customer_id, sellerCustomerId: input.seller_customer_id,
      workspaceId: input.workspace_id, channelId: input.channel_id,
      channelDisplayName: channel.displayName, channelPhoneNumber: channel.phoneNumber
    });
    return { grant };
  });
  app.post("/admin/talk-supervision/grants/:id/revoke", async (request) => {
    const user = await admin(request.headers.authorization, request.headers["x-admin-action-token"], true);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return { grant: await revokeGrant(app.prisma, user.clerkUserId, id) };
  });
};
