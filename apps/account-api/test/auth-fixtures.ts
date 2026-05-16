import type { AuthenticatedUser, AuthVerifier } from "../src/modules/auth/types.js";

export function createStaticAuthVerifier(user: AuthenticatedUser): AuthVerifier {
  return {
    async verifyBearerToken() {
      return user;
    }
  };
}
