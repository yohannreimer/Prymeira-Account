import { z } from "zod";

export const productTeamQuerySchema = z.object({
  product_key: z.string().min(1)
});

export const inviteProductMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "member"]).default("member"),
  product_key: z.string().min(1)
});

export const updateProductMemberSchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  product_key: z.string().min(1)
});

export const customerMemberParamsSchema = z.object({
  customer_id: z.string().uuid()
});
