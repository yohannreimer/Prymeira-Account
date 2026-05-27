import { describe, expect, it } from "vitest";
import { resolveSelectedPlanContext } from "./plans-selection";

describe("resolveSelectedPlanContext", () => {
  it("selects the explicit plan from the URL over the recommended plan", () => {
    expect(resolveSelectedPlanContext("suite", null, ["start", "empresa", "empresa-pro", "suite"], [])).toEqual({
      selectedId: "suite",
      selectedName: "Suite Completa",
      source: "plan"
    });
  });

  it("selects a plan that includes the requested product when product context is present", () => {
    expect(resolveSelectedPlanContext(null, "media", ["start", "empresa", "empresa-pro", "suite"], ["suite"])).toEqual({
      selectedId: "suite",
      selectedName: "Suite Completa",
      source: "product"
    });
  });
});
