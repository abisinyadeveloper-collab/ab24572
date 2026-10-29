import { describe, it, expect } from "vitest";
import { MEDIA_MODELS, getVoiceLanguage, ownsMediaPath } from "./ghost-media";
describe("Ghost creative and voice rules", () => {
  it("uses quality-first image generation and editing", () => expect(MEDIA_MODELS.image).toBe("openai/gpt-image-2.5-sunburst"));
  it("uses the current default video model", () => expect(MEDIA_MODELS.video).toBe("google/gemini-omni-1.1-flash"));
  it("defaults live calls to Amharic", () => expect(getVoiceLanguage().id).toBe("am"));
  it("honors a selected conversation language", () => expect(getVoiceLanguage("sw").id).toBe("sw"));
  it("rejects another account’s saved media path", () => expect(ownsMediaPath("owner", "other/photo.png")).toBe(false));
  it("accepts the owner’s saved media path", () => expect(ownsMediaPath("owner", "owner/photo.png")).toBe(true));
});