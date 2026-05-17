type RuntimeConfig = Record<string, string | undefined>;

declare global {
  interface Window {
    __PRYMEIRA_CONFIG__?: RuntimeConfig;
  }
}

const env = import.meta.env as RuntimeConfig;

function readConfig(key: string) {
  return window.__PRYMEIRA_CONFIG__?.[key] ?? env[key];
}

export const clerkPublishableKey = readConfig("VITE_CLERK_PUBLISHABLE_KEY")
  ?? readConfig("CLERK_PUBLISHABLE_KEY");

export const accountApiUrl = (
  readConfig("VITE_PRYMEIRA_ACCOUNT_API_URL")
    ?? readConfig("PRYMEIRA_ACCOUNT_API_URL")
    ?? "http://localhost:3001"
).replace(/\/$/, "");

export function resolveConfiguredProductUrl(
  productKey: string,
  fallbackUrl: string | null | undefined
) {
  const overrideKey = `VITE_PRODUCT_${productKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_URL`;
  return readConfig(overrideKey) ?? fallbackUrl ?? "#";
}
