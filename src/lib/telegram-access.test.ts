import { describe, expect, it } from "vitest";
import { telegramUserId } from "./telegram-access";

const privateMessage = (id: number) => ({ chat: { id, type: "private" }, from: { id } });
describe("public Telegram identity", () => {
  it("allows any real sender without a phone or allowlist", () => {
    expect(telegramUserId(privateMessage(42))).toBe(42);
    expect(telegramUserId(privateMessage(987654321))).toBe(987654321);
  });
  it("keeps different users under different IDs", () => {
    expect(telegramUserId(privateMessage(42))).not.toBe(telegramUserId(privateMessage(43)));
  });
  it("rejects messages without sender identity", () => expect(telegramUserId({ chat: { id: 42, type: "private" } })).toBeNull());
  it("rejects a chat belonging to another ID", () => expect(telegramUserId({ chat: { id: 43, type: "private" }, from: { id: 42 } })).toBeNull());
  it("rejects group access", () => expect(telegramUserId({ chat: { id: -42, type: "group" }, from: { id: 42 } })).toBeNull());
  it("rejects bot senders", () => expect(telegramUserId({ ...privateMessage(42), from: { id: 42, is_bot: true } })).toBeNull());
  it("rejects invalid IDs", () => {
    for (const id of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(telegramUserId(privateMessage(id))).toBeNull();
  });
});
