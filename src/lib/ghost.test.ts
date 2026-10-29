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

import { getTier } from "./ghost";
describe("tiers", () => {
  it("lite is fast single-model", () => expect(getTier("lite")).toMatchObject({ effort: "low", synthesize: false }));
  it("ayna is balanced single-model", () => expect(getTier("ayna")).toMatchObject({ effort: "medium", synthesize: false }));
  it("ghost is the most powerful two-model tier and the default", () => {
    expect(getTier("ghost")).toMatchObject({ effort: "high", synthesize: true });
    expect(getTier(undefined).id).toBe("ghost");
  });
});

import { pickTier, extractMemoryFacts } from "./ghost";
describe("auto tier", () => {
  it("short chat uses Lite", () => expect(pickTier("hi, how are you?")).toBe("lite"));
  it("deep work uses Ghost", () => expect(pickTier("Design the architecture for a payments service")).toBe("ghost"));
  it("medium question uses Ayna", () => expect(pickTier("Can you explain how photosynthesis works in plants and why leaves change their color during autumn months?")).toBe("ayna"));
});
describe("memory facts", () => {
  it("saves explicit remember requests", () => expect(extractMemoryFacts("Remember that my project is Cedar.")).toEqual(["my project is Cedar"]));
  it("saves self-descriptions", () => expect(extractMemoryFacts("My name is Abel. What is 2+2?")).toEqual(["My name is Abel"]));
  it("ignores ordinary questions", () => expect(extractMemoryFacts("What is the capital of Kenya?")).toEqual([]));
});
