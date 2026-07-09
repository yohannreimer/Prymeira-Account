const PLAN_LABELS: Record<string, string> = {
  start: "Start",
  empresa: "Empresa",
  "empresa-pro": "Empresa Pro",
  suite: "Suite Completa",
  base: "Baase",
  operis: "Operis",
  media: "Flowcut"
};

export type SelectedPlanContext = {
  selectedId: string | null;
  selectedName: string | null;
  source: "plan" | "product" | null;
};

export function resolveSelectedPlanContext(
  planId: string | null,
  productKey: string | null,
  planIds: string[],
  productPlanIds: string[]
): SelectedPlanContext {
  if (planId && planIds.includes(planId)) {
    return {
      selectedId: planId,
      selectedName: PLAN_LABELS[planId] ?? planId,
      source: "plan"
    };
  }

  const [productPlanId] = productPlanIds;

  if (productKey && productPlanId) {
    return {
      selectedId: productPlanId,
      selectedName: PLAN_LABELS[productPlanId] ?? productPlanId,
      source: "product"
    };
  }

  return {
    selectedId: null,
    selectedName: null,
    source: null
  };
}
