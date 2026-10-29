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

import { pickAgent, detectMediaIntent } from "./ghost";
describe("auto agent", () => {
  it("routes code questions to Coder", () => expect(pickAgent("Fix this TypeScript bug in my function")).toBe("coder"));
  it("routes security questions to Defender", () => expect(pickAgent("Harden my API against attack")).toBe("defender"));
  it("routes research questions to Researcher", () => expect(pickAgent("Can you explain how photosynthesis works?")).toBe("researcher"));
  it("routes decisions to Arbiter", () => expect(pickAgent("Which option should I choose for my database?")).toBe("arbiter"));
  it("defaults planning questions to Architect", () => expect(pickAgent("Design the architecture for a payments service")).toBe("architect"));
});
describe("media intent from the question", () => {
  it("detects image requests", () => expect(detectMediaIntent("Generate an image of a lion at sunrise")).toEqual({ kind: "image", prompt: "Generate an image of a lion at sunrise" }));
  it("detects video requests", () => expect(detectMediaIntent("Make a short video of ocean waves")).toEqual({ kind: "video", prompt: "Make a short video of ocean waves" }));
  it("ignores ordinary questions", () => expect(detectMediaIntent("What is the capital of Kenya?")).toBeNull());
  it("ignores design work without media", () => expect(detectMediaIntent("Design a database schema for orders")).toBeNull());
});

import { detectPhoneAction as dpa, detectMediaIntent as dmi } from "./ghost";
describe("phone actions", () => {
  it("opens tiktok", () => expect(dpa("my ghost open tiktok")).toMatchObject({ kind: "open", app: "tiktok" }));
  it("scrolls tiktok videos", () => expect(dpa("scroll tiktok videos")).toMatchObject({ kind: "open", app: "tiktok" }));
  it("calls a number", () => expect(dpa("call 0911 234 567")).toEqual({ kind: "call", number: "0911234567" }));
  it("ignores normal chat", () => expect(dpa("how do I open a bank account")).toBeNull());
  it("detects build an image", () => expect(dmi("build an login page image")?.kind).toBe("image"));
  it("detects amharic image", () => expect(dmi("የአንበሳ ምስል ፍጠር")?.kind).toBe("image"));
});
