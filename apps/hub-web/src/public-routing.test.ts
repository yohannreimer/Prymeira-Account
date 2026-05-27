import { describe, expect, it } from "vitest";
import { shouldRenderPublicLanding } from "./public-routing";

describe("shouldRenderPublicLanding", () => {
  it("treats the institutional apex, www host, and preview path as public landing routes", () => {
    expect(shouldRenderPublicLanding({ hostname: "prymeiradigital.com.br", pathname: "/" })).toBe(true);
    expect(shouldRenderPublicLanding({ hostname: "www.prymeiradigital.com.br", pathname: "/" })).toBe(true);
    expect(shouldRenderPublicLanding({ hostname: "hub.prymeiradigital.com.br", pathname: "/landing-preview" })).toBe(true);
  });

  it("keeps Hub app routes behind the authenticated app shell", () => {
    expect(shouldRenderPublicLanding({ hostname: "hub.prymeiradigital.com.br", pathname: "/" })).toBe(false);
    expect(shouldRenderPublicLanding({ hostname: "hub.prymeiradigital.com.br", pathname: "/planos" })).toBe(false);
    expect(shouldRenderPublicLanding({ hostname: "app.prymeiradigital.com.br", pathname: "/" })).toBe(false);
  });
});
