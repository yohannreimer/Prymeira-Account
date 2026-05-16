import { createClerkClient, verifyToken } from "@clerk/backend";
import { loadEnv } from "../../env.js";
import { ApiError } from "../../lib/errors.js";
import type { AuthenticatedUser, AuthVerifier } from "./types.js";

export function createClerkAuthVerifier(): AuthVerifier {
  const env = loadEnv();
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  return {
    async verifyBearerToken(authorizationHeader) {
      const token = extractBearerToken(authorizationHeader);
      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      const clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
      }

      const user = await clerk.users.getUser(clerkUserId);
      const email = user.primaryEmailAddress?.emailAddress;

      if (!email) {
        throw new ApiError(401, "UNAUTHORIZED", "Authenticated user has no primary email.");
      }

      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;

      return {
        clerkUserId,
        email,
        ...(name ? { name } : {})
      } satisfies AuthenticatedUser;
    }
  };
}

export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  return token;
}
