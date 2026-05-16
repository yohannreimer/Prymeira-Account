import type { AccessDecision } from "./types.js";

export class PrymeiraAuthError extends Error {}

export class MissingAuthTokenError extends PrymeiraAuthError {
  constructor() {
    super("Authentication token is required.");
  }
}

export class ProductAccessDeniedError extends PrymeiraAuthError {
  constructor(public readonly decision: AccessDecision) {
    super(`Access denied for product ${decision.product_key}: ${decision.reason}`);
  }
}
