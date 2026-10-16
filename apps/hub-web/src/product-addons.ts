/** Paid add-ons a product unlocks from its entitlement's `limits.modules`. The product reads the flag from the access check. */
export type ProductAddon = { key: string; label: string; description: string };

const addonsByProduct: Record<string, ProductAddon[]> = {
  talk: [{ key: "orcamentos", label: "Orçamentos (compras)", description: "Libera a aba Orçamentos no Talk." }]
};

export function productAddons(productKey: string): ProductAddon[] {
  return addonsByProduct[productKey] ?? [];
}

function modulesOf(limits: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const modules = limits?.modules;
  return modules && typeof modules === "object" && !Array.isArray(modules) ? (modules as Record<string, unknown>) : {};
}

/** Which of the product's add-ons the entitlement already has turned on. */
export function enabledAddons(productKey: string, limits: Record<string, unknown> | null | undefined): Record<string, boolean> {
  const modules = modulesOf(limits);
  return Object.fromEntries(productAddons(productKey).map((addon) => [addon.key, modules[addon.key] === true]));
}

/** The limits to save: everything already there is kept, and only the product's add-on flags change. */
export function limitsWithAddons(
  productKey: string,
  currentLimits: Record<string, unknown> | null | undefined,
  selection: Record<string, boolean>
): Record<string, unknown> {
  const limits = { ...(currentLimits ?? {}) };
  const addons = productAddons(productKey);
  if (!addons.length) return limits;
  const modules = { ...modulesOf(currentLimits) };
  for (const addon of addons) modules[addon.key] = selection[addon.key] === true;
  return { ...limits, modules };
}
