import { describe, expect, it } from "vitest";
import {
  buildCheckoutSuccessUrl,
  buildPlanSelectionUrl,
  readCheckoutSuccessQuery
} from "./checkout-flow";

describe("checkout flow helpers", () => {
  it("returns checkout users to the Hub after Stripe succeeds", () => {
    expect(buildCheckoutSuccessUrl("https://hub.prymeiradigital.com.br", "empresa")).toBe(
      "https://hub.prymeiradigital.com.br/?checkout_success=1&plan=empresa"
    );
  });

  it("reads the Hub checkout success query", () => {
    expect(readCheckoutSuccessQuery("?checkout_success=1&plan=empresa")).toEqual({
      checkoutSuccess: true,
      planId: "empresa"
    });
  });

  it("links landing plan cards to their specific plan context", () => {
    expect(buildPlanSelectionUrl("https://hub.prymeiradigital.com.br", "suite")).toBe(
      "https://hub.prymeiradigital.com.br/planos?plan=suite"
    );
  });
});
