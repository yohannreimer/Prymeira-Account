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
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_START_MONTHLY: z.string().default(""),
  STRIPE_PRICE_START_ANNUAL: z.string().default(""),
  STRIPE_PRICE_EMPRESA_MONTHLY: z.string().default(""),
  STRIPE_PRICE_EMPRESA_ANNUAL: z.string().default(""),
  STRIPE_PRICE_EMPRESA_PRO_MONTHLY: z.string().default(""),
  STRIPE_PRICE_EMPRESA_PRO_ANNUAL: z.string().default(""),
  STRIPE_PRICE_SUITE_MONTHLY: z.string().default(""),
  STRIPE_PRICE_SUITE_ANNUAL: z.string().default(""),
  STRIPE_PRICE_OPERIS_MONTHLY: z.string().default(""),
  STRIPE_PRICE_OPERIS_ANNUAL: z.string().default(""),
  STRIPE_PRICE_MEDIA_MONTHLY: z.string().default(""),
  STRIPE_PRICE_MEDIA_ANNUAL: z.string().default("")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}
