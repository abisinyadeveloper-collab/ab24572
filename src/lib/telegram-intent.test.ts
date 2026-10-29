import { describe, expect, it } from "vitest";
import { telegramIntent } from "./telegram-intent";
describe("Telegram creative routing", () => {
  it("routes requested images", () => expect(telegramIntent("/image a lion", false)).toEqual({ kind: "image", prompt: "a lion" }));
  it("routes requested videos", () => expect(telegramIntent("create a video of rain", false)?.kind).toBe("video"));
  it("routes edits with uploaded images", () => expect(telegramIntent("remove the background", true)?.kind).toBe("image"));
  it("routes website files rather than images", () => expect(telegramIntent("build a website for my bakery", false)?.kind).toBe("site"));
  it("leaves ordinary questions as chat", () => expect(telegramIntent("what is a video codec?", false)).toBeNull());
});