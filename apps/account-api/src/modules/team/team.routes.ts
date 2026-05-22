import type { FastifyPluginAsync } from "fastify";
import {
  customerMemberParamsSchema,
  inviteProductMemberSchema,
  productTeamQuerySchema,
  updateProductMemberSchema
} from "./team.schemas.js";
import { inviteProductMember, listProductTeam, updateProductMember } from "./team.service.js";

export const teamRoutes: FastifyPluginAsync = async (app) => {
  app.get("/team/members", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const query = productTeamQuerySchema.parse(request.query);
    return listProductTeam(app.prisma, user, query.product_key);
  });

  app.post("/team/members/invite", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const input = inviteProductMemberSchema.parse(request.body);
    return inviteProductMember(app.prisma, user, {
      email: input.email,
      name: input.name,
      role: input.role,
      productKey: input.product_key
    });
  });

  app.patch("/team/members/:customer_id", async (request) => {
    const user = await app.authVerifier.verifyBearerToken(request.headers.authorization);
    const params = customerMemberParamsSchema.parse(request.params);
    const input = updateProductMemberSchema.parse(request.body);
    return {
      member: await updateProductMember(app.prisma, user, {
        customerId: params.customer_id,
        productKey: input.product_key,
        role: input.role,
        status: input.status
      })
    };
  });
};
