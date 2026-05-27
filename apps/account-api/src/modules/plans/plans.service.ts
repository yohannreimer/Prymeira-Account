import Stripe from "stripe";
import type { Env } from "../../env.js";

type PlanPrice = {
  id: string;
  priceMonthly: number;
  priceAnnual: number;
};

export type PlansResponse = {
  plans: PlanPrice[];
  solos: PlanPrice[];
};

async function fetchUnitAmount(stripe: Stripe, priceId: string): Promise<number> {
  if (!priceId) return 0;
  const price = await stripe.prices.retrieve(priceId);
  return Math.round((price.unit_amount ?? 0) / 100);
}

export async function getPlans(stripe: Stripe, env: Env): Promise<PlansResponse> {
  const [
    startMonthly,
    startAnnual,
    empresaMonthly,
    empresaAnnual,
    empresaProMonthly,
    empresaProAnnual,
    suiteMonthly,
    suiteAnnual,
    operisMonthly,
    operisAnnual,
    mediaMonthly,
    mediaAnnual,
  ] = await Promise.all([
    fetchUnitAmount(stripe, env.STRIPE_PRICE_START_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_START_ANNUAL),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_EMPRESA_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_EMPRESA_ANNUAL),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_EMPRESA_PRO_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_EMPRESA_PRO_ANNUAL),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_SUITE_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_SUITE_ANNUAL),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_OPERIS_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_OPERIS_ANNUAL),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_MEDIA_MONTHLY),
    fetchUnitAmount(stripe, env.STRIPE_PRICE_MEDIA_ANNUAL),
  ]);

  return {
    plans: [
      { id: "start",       priceMonthly: startMonthly,      priceAnnual: startAnnual },
      { id: "empresa",     priceMonthly: empresaMonthly,    priceAnnual: empresaAnnual },
      { id: "empresa-pro", priceMonthly: empresaProMonthly, priceAnnual: empresaProAnnual },
      { id: "suite",       priceMonthly: suiteMonthly,      priceAnnual: suiteAnnual },
    ],
    solos: [
      { id: "operis", priceMonthly: operisMonthly, priceAnnual: operisAnnual },
      { id: "media",  priceMonthly: mediaMonthly,  priceAnnual: mediaAnnual },
    ],
  };
}
