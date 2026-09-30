import type { AccountProductAccess, TalkSupervisionGrant } from "./types";

export function talkSupervisionEntry(products: AccountProductAccess[], grants: TalkSupervisionGrant[], configuredUrl?: string) {
  if (grants.length === 0) return null;
  const appUrl = configuredUrl ?? products.find((product) => product.product_key === "talk")?.app_url;
  if (!appUrl || appUrl === "#") return null;
  let url: URL;
  try { url = new URL(appUrl); } catch { return null; }
  if (!["https:", "http:"].includes(url.protocol)) return null;
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set("module", "supervisao");
  return url.toString();
}
