import { z } from "zod";

const jsonRecordSchema = z.record(z.unknown()).default({});
const productKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use only lowercase letters, numbers, underscores and hyphens.");
const productStatusSchema = z.enum(["active", "inactive", "archived"]);

export const listCustomersQuerySchema = z.object({
  search: z.string().min(1).optional()
});

export const customerParamsSchema = z.object({
  id: z.string().uuid()
});

export const upsertEntitlementSchema = z.object({
  workspace_id: z.string().uuid(),
  product_key: z.string().min(1),
  status: z.enum(["active", "trial", "expired", "blocked", "cancelled", "internal"]),
  plan: z.string().min(1).default("free"),
  source: z.enum(["manual", "trial", "payment", "internal", "admin", "migration"]),
  seats_limit: z.number().int().positive().max(1000).optional(),
  ends_at: z.string().datetime().nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_ends_at: z.string().datetime().nullable().optional(),
  limits: jsonRecordSchema,
  metadata: jsonRecordSchema
});

export const blockEntitlementSchema = z.object({
  workspace_id: z.string().uuid(),
  product_key: z.string().min(1),
  reason: z.string().min(1).default("manual_block")
});

export const trialEntitlementSchema = z.object({
  workspace_id: z.string().uuid(),
  product_key: z.string().min(1),
  plan: z.string().min(1).default("trial"),
  trial_days: z.number().int().positive().max(365)
});

export const productParamsSchema = z.object({
  product_key: productKeySchema
});

export const createProductSchema = z.object({
  product_key: productKeySchema,
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  app_url: z.string().url(),
  marketing_url: z.string().url().nullable().optional(),
  status: productStatusSchema.default("active")
});

export const updateProductSchema = createProductSchema.omit({ product_key: true });
