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
  STRIPE_PRICE_MEDIA_ANNUAL: z.string().default(""),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  DEMO_USER_ID: z.string().default("demo_user"),
  DEMO_EMAIL: z.string().email().default("demo@prymeira.local"),
  DEMO_NAME: z.string().default("Usuario Demo"),
  DEMO_WORKSPACE_ID: z.string().default("demo_workspace"),
  DEMO_WORKSPACE_NAME: z.string().default("Prymeira Demo"),
  VITE_PRYMEIRA_HUB_URL: z.string().url().default("http://localhost:5175")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(input);
}

export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE === "true";
}
