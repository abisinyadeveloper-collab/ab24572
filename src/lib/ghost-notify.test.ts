import { describe, expect, it } from "vitest";
import { deviceLabel, shouldAlertSignIn, shouldSendWelcome } from "./ghost-notify";

const now = Date.parse("2026-11-01T06:00:00Z");

describe("ghost email notification rules", () => {
  it("sends welcome once to a new confirmed account", () => {
    expect(shouldSendWelcome({ confirmed: true, createdAt: "2026-10-31T06:00:00Z", alreadySent: false, now })).toBe(true);
    expect(shouldSendWelcome({ confirmed: true, createdAt: "2026-10-31T06:00:00Z", alreadySent: true, now })).toBe(false);
  });
  it("never welcomes unconfirmed or old accounts", () => {
    expect(shouldSendWelcome({ confirmed: false, createdAt: "2026-10-31T06:00:00Z", alreadySent: false, now })).toBe(false);
    expect(shouldSendWelcome({ confirmed: true, createdAt: "2026-09-01T06:00:00Z", alreadySent: false, now })).toBe(false);
  });
  it("alerts only for a new device when another device is known", () => {
    expect(shouldAlertSignIn({ deviceKnown: false, knownDevices: 1, enabled: true })).toBe(true);
    expect(shouldAlertSignIn({ deviceKnown: false, knownDevices: 0, enabled: true })).toBe(false);
    expect(shouldAlertSignIn({ deviceKnown: true, knownDevices: 2, enabled: true })).toBe(false);
  });
  it("respects the profile switch for sign-in alerts", () => {
    expect(shouldAlertSignIn({ deviceKnown: false, knownDevices: 3, enabled: false })).toBe(false);
  });
  it("labels devices", () => {
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toBe("Chrome on Android");
  });
});
