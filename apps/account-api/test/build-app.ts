import { buildApp } from "../src/app.js";
import type { AuthVerifier } from "../src/modules/auth/types.js";

export async function buildTestApp(authVerifier: AuthVerifier) {
  return buildApp({ authVerifier });
}
