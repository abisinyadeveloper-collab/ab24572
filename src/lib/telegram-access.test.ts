import { describe, expect, it } from "vitest";
import { isAllowedTelegramUser } from "./telegram-access";

const list = "123456789, +251911234567";

describe("telegram allow-list", () => {
  it("allows a listed Telegram ID", () => expect(isAllowedTelegramUser(list, 123456789)).toBe(true));
  it("refuses an unlisted ID with no phone", () => expect(isAllowedTelegramUser(list, 42)).toBe(false));
  it("allows a listed phone", () => expect(isAllowedTelegramUser(list, 42, "251911234567")).toBe(true));
  it("matches local 09 format against international", () => expect(isAllowedTelegramUser("0911234567", 42, "+251911234567")).toBe(true));
  it("refuses an unlisted phone", () => expect(isAllowedTelegramUser(list, 42, "+251900000000")).toBe(false));
  it("refuses everyone when the list is empty", () => expect(isAllowedTelegramUser("", 123456789, "+251911234567")).toBe(false));
});
