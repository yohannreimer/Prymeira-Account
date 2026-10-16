import { describe, expect, it } from "vitest";
import { enabledAddons, limitsWithAddons, productAddons } from "./product-addons";

describe("product add-ons", () => {
  it("lists Orçamentos only for Talk", () => {
    expect(productAddons("talk").map((addon) => addon.key)).toEqual(["orcamentos"]);
    expect(productAddons("crm")).toEqual([]);
  });

  it("reads what the entitlement already has on", () => {
    expect(enabledAddons("talk", { modules: { orcamentos: true } })).toEqual({ orcamentos: true });
    expect(enabledAddons("talk", {})).toEqual({ orcamentos: false });
    expect(enabledAddons("talk", { modules: "x" })).toEqual({ orcamentos: false });
  });

  it("turns the add-on on without dropping other limits", () => {
    expect(limitsWithAddons("talk", { messages: 500, modules: { outro: true } }, { orcamentos: true }))
      .toEqual({ messages: 500, modules: { outro: true, orcamentos: true } });
  });

  it("turns it off explicitly and leaves products without add-ons untouched", () => {
    expect(limitsWithAddons("talk", { modules: { orcamentos: true } }, {})).toEqual({ modules: { orcamentos: false } });
    expect(limitsWithAddons("crm", { messages: 1 }, { orcamentos: true })).toEqual({ messages: 1 });
    expect(limitsWithAddons("talk", undefined, { orcamentos: true })).toEqual({ modules: { orcamentos: true } });
  });
});
