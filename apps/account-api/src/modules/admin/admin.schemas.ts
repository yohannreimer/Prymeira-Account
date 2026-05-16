import { z } from "zod";

const jsonRecordSchema = z.record(z.unknown()).default({});

export const listCustomersQuerySchema = z.object({
  search: z.string().min(1).optional()
});

export const customerParamsSchema = z.object({
  id: z.string().uuid()
});

export const upsertEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  status: z.enum(["active", "trial", "expired", "blocked", "cancelled", "internal"]),
  plan: z.string().min(1).default("free"),
  source: z.enum(["manual", "trial", "payment", "internal", "admin", "migration"]),
  ends_at: z.string().datetime().nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_ends_at: z.string().datetime().nullable().optional(),
  limits: jsonRecordSchema,
  metadata: jsonRecordSchema
});

export const blockEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  reason: z.string().min(1).default("manual_block")
});

export const trialEntitlementSchema = z.object({
  customer_id: z.string().uuid(),
  product_key: z.string().min(1),
  plan: z.string().min(1).default("trial"),
  trial_days: z.number().int().positive().max(365)
});
