import type { FastifyPluginAsync } from "fastify";
import { syncCustomerSchema } from "./customers.schemas.js";
import { syncCustomer } from "./customers.service.js";

export const customersRoutes: FastifyPluginAsync = async (app) => {
  app.post("/customers/sync", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const input = syncCustomerSchema.parse(request.body);
    const { customer, workspaceContext } = await syncCustomer(app.prisma, user, input);

    return {
      customer_id: customer.id,
      clerk_user_id: customer.clerkUserId,
      email: customer.email,
      workspace: {
        id: workspaceContext.workspace.id,
        name: workspaceContext.workspace.name,
        type: workspaceContext.workspace.type,
        role: workspaceContext.membership.role
      }
    };
  });
};
