import type { Env } from "../../env.js";
import { ApiError } from "../../lib/errors.js";
import { demoCustomer } from "../demo/demo-fixtures.js";
import type { AuthVerifier } from "./types.js";

export function createDemoAuthVerifier(env: Env): AuthVerifier {
  return {
    async verifyBearerToken(authorizationHeader) {
      const token = extractBearerToken(authorizationHeader);

      if (token !== "demo-token") {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
      }

      const customer = demoCustomer(env);

      return {
        clerkUserId: customer.clerkUserId,
        email: customer.email,
        name: customer.name
      };
    }
  };
}

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  return token;
}
