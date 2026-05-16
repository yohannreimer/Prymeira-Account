import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().default(""),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}
