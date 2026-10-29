import { describe, it, expect } from "vitest";
import { GHOST_MODELS, ownsThread } from "./ghost";
describe("Ghost account and model rules", () => {
  it("uses the approved GPT-6 Astra draft model", () =>
    expect(GHOST_MODELS.draft).toBe("openai/gpt-6-astra"));
  it("uses the approved Fable 5.1 synthesis model", () =>
    expect(GHOST_MODELS.synthesis).toBe("anthropic/claude-fable-5-1"));
  it("denies another account access to a saved thread", () =>
    expect(ownsThread("owner-a", "owner-b")).toBe(false));
  it("allows an owner to access their saved thread", () =>
    expect(ownsThread("owner-a", "owner-a")).toBe(true));
});
