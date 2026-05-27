export function buildCheckoutSuccessUrl(origin: string, planId: string) {
  const url = new URL("/", origin);
  url.searchParams.set("checkout_success", "1");
  url.searchParams.set("plan", planId);
  return url.toString();
}

export function buildPlanSelectionUrl(hubUrl: string, planId: string) {
  const url = new URL("/planos", hubUrl);
  url.searchParams.set("plan", planId);
  return url.toString();
}

export function readCheckoutSuccessQuery(search: string) {
  const params = new URLSearchParams(search);
  return {
    checkoutSuccess: params.get("checkout_success") === "1",
    planId: params.get("plan")?.trim() || null
  };
}
