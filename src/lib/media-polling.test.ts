import { describe, expect, it } from "vitest";
import { videoPollDelay } from "./media-polling";
describe("Video status recovery", () => {
  it("backs off transient failures without resubmitting creation", () => {
    expect(videoPollDelay(503, 0)).toBe(8000);
    expect(videoPollDelay(503, 1)).toBe(16000);
    expect(videoPollDelay(429, 2)).toBe(32000);
    expect(videoPollDelay(503, 4)).toBeNull();
  });
  it.each([400, 401, 402, 403, 404])("never retries terminal %i failures", status => {
    expect(videoPollDelay(status, 0)).toBeNull();
  });
});