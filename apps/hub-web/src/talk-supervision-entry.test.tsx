import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TalkSupervisionEntry } from "./TalkSupervisionEntry";
import { talkSupervisionEntry } from "./talk-supervision-entry";
import type { AccountProductAccess, TalkSupervisionGrant } from "./types";
const lockedTalk: AccountProductAccess = { product_key: "talk", name: "Talk", app_url: "https://talk.example.com/app?module=chat", description: null, marketing_url: null, status: "locked", allowed: false, reason: "no_entitlement" };
const grant = { seller_customer_id: "seller" } as TalkSupervisionGrant;
describe("supervision product entry", () => {
  it("offers an accessible supervision link with no own Talk access", () => {
    const href = talkSupervisionEntry([lockedTalk], [grant]);
    expect(href).toBe("https://talk.example.com/?module=supervisao");
    const html = renderToStaticMarkup(<TalkSupervisionEntry href={href!} sellerCount={1} />);
    expect(html).toContain('href="https://talk.example.com/?module=supervisao"');
    expect(html).toContain("Abrir supervisão");
    expect(html).toContain("somente leitura");
    expect(lockedTalk.allowed).toBe(false);
  });
  it("does not offer access without grants", () => {
    expect(talkSupervisionEntry([lockedTalk], [])).toBeNull();
  });
  it("uses configured Talk root", () => {
    expect(talkSupervisionEntry([], [grant], "http://localhost:5176/chat")).toBe("http://localhost:5176/?module=supervisao");
  });
});
