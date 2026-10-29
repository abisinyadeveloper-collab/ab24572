import { detectMediaIntent } from "./ghost";
export function telegramIntent(text: string, hasImage: boolean) {
  const command = text.match(/^\/(image|video|edit|site)(?:@\w+)?\s+([\s\S]+)/i);
  if (command) {
    const mode = command[1]?.toLowerCase();
    return { kind: mode === "edit" ? "image" : mode as "image" | "video" | "site", prompt: command[2] ?? "" };
  }
  if (hasImage && /\b(edit|change|replace|remove|add|transform|retouch|recolor)\b|ቀይር|አስተካክል/i.test(text)) return { kind: "image" as const, prompt: text };
  if (/\b(create|build|make|design)\b.*\b(website|web page|landing page|html site)\b/i.test(text)) return { kind: "site" as const, prompt: text };
  return detectMediaIntent(text);
}