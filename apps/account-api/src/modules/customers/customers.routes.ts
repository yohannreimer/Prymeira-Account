import type { FastifyPluginAsync } from "fastify";
import { isDemoMode, loadEnv } from "../../env.js";
import { ApiError } from "../../lib/errors.js";
import { demoCustomer, demoWorkspace } from "../demo/demo-fixtures.js";
import { syncCustomerSchema } from "./customers.schemas.js";
import { syncCustomer } from "./customers.service.js";

export const customersRoutes: FastifyPluginAsync = async (app) => {
  const env = loadEnv();

  app.post("/customers/sync", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const input = syncCustomerSchema.parse(request.body);

    if (isDemoMode(env)) {
      if (input.clerk_user_id !== user.clerkUserId || input.email !== user.email) {
        throw new ApiError(403, "FORBIDDEN", "Demo identity cannot be changed.");
      }

      const customer = demoCustomer(env);
      const workspace = demoWorkspace(env);

      return {
        customer_id: customer.id,
        clerk_user_id: customer.clerkUserId,
        email: customer.email,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          type: workspace.type,
          role: workspace.role
        }
      };
    }

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
