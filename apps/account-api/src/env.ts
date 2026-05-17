import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: [".env", "../../.env"], quiet: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().default(""),
  ADMIN_ACTION_TOKEN: z.string().default(""),
  CORS_ORIGINS: z.string().default(""),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}
