import { ApiError } from "../../lib/errors.js";

export function parseAdminEmails(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function assertAdminEmail(email: string, adminEmails: Set<string>) {
  if (!adminEmails.has(email.trim().toLowerCase())) {
    throw new ApiError(403, "FORBIDDEN", "Admin access is required.");
  }
}
