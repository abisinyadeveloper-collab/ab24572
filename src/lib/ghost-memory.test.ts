import { describe, expect, it } from "vitest";
import { extractMemoryFacts } from "./ghost";
import { memoriesToForget, selectMemories, personalizeMediaPrompt, parseForgetRequest } from "./ghost-memory";

describe("long-term memory rules", () => {
  it("uses an older relevant project beyond the old forty-row window", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: String(i), fact: `Saved unrelated note ${i}` }));
    rows.push({ id: "cedar", fact: "Cedar uses TypeScript" });
    expect(selectMemories(rows, "Help with Cedar").map(r => r.id)).toContain("cedar");
  });
  it("keeps the latest location correction", () => expect(selectMemories([{ id: "new", fact: "I live in Nairobi" }, { id: "old", fact: "I live in Addis Ababa" }], "Where do I live?").map(r => r.id)).toEqual(["new"]));
  it("deduplicates facts", () => expect(selectMemories([{ id: "a", fact: "My name is Abel." }, { id: "b", fact: "my name is Abel" }], "What is my name?")).toHaveLength(1));
  it("does not save questions as personal facts", () => expect(extractMemoryFacts("Do you know my name is Abel?")).toEqual([]));
  it("does not save credentials", () => expect(extractMemoryFacts("Remember my password is secret123")).toEqual([]));
  it("supports explicit forgetting without saving it again", () => { expect(parseForgetRequest("Forget my name.")).toBe("my name"); expect(extractMemoryFacts("Forget that my name is Abel.")).toEqual([]); });
  it("forgets only matching facts", () => expect(memoriesToForget("my name", [{ id: "a", fact: "My name is Abel" }, { id: "b", fact: "I prefer short replies" }]).map(r => r.id)).toEqual(["a"]));
  it("supports removing all saved memories", () => expect(memoriesToForget("all my memories", [{ id: "a", fact: "My name is Abel" }])).toHaveLength(1));
  it("keeps unrelated personal details out of creative prompts", () => expect(personalizeMediaPrompt("Create an image of a lion", [{ id: "a", fact: "I live in Nairobi" }])).toBe("Create an image of a lion"));
  it("adds relevant creative preferences", () => expect(personalizeMediaPrompt("Create a Cedar logo", [{ id: "a", fact: "Cedar uses green branding" }])).toContain("Cedar uses green branding"));
});