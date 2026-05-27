import { describe, expect, it } from "vitest";
import { resolveProductDescription } from "./product-card-copy";

describe("resolveProductDescription", () => {
  it("uses the admin/API description before the static presentation copy", () => {
    expect(
      resolveProductDescription({
        productDescription: "Descricao editada pelo admin.",
        presentationDescription: "Descricao padrao do produto."
      })
    ).toBe("Descricao editada pelo admin.");
  });

  it("falls back to static presentation copy when the product has no custom description", () => {
    expect(
      resolveProductDescription({
        productDescription: null,
        presentationDescription: "Descricao padrao do produto."
      })
    ).toBe("Descricao padrao do produto.");
  });
});
