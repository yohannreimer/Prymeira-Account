import { z } from "zod";

export const syncCustomerSchema = z.object({
  clerk_user_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional()
});
