import { describe, expect, it } from "vitest";
import { friendlyAuthError, passwordIssue, readAuthLink } from "./auth-rules";

describe("auth rules", () => {
  it("requires 8+ characters", () => {
    expect(passwordIssue("abc123", "abc123")).not.toBeNull();
    expect(passwordIssue("abcdef12", "abcdef12")).toBeNull();
  });
  it("requires a number and letters", () => {
    expect(passwordIssue("abcdefgh", "abcdefgh")).not.toBeNull();
  });
  it("requires both passwords to match", () => {
    expect(passwordIssue("abcdef12", "abcdef13")).toBe("The two passwords don't match.");
  });
  it("flags unconfirmed email so the resend option appears", () => {
    expect(friendlyAuthError("Email not confirmed").unconfirmed).toBe(true);
  });
  it("detects an expired email link", () => {
    const r = readAuthLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "");
    expect(r.error).toMatch(/expired/);
  });
  it("detects a recovery link", () => {
    expect(readAuthLink("#access_token=x&type=recovery", "").type).toBe("recovery");
  });
});
