export const GHOST_MODELS = {
  draft: "openai/gpt-6-astra",
  synthesis: "anthropic/claude-fable-5-1",
} as const;
// Three Ghost tiers: Lite (fast), Ayna (balanced), Ghost (most powerful, two-model workflow).
export const tiers = [
  { id: "lite", name: "Lite", label: "Fast answers", effort: "low", synthesize: false },
  { id: "ayna", name: "Ayna", label: "Balanced reasoning", effort: "medium", synthesize: false },
  { id: "ghost", name: "Ghost", label: "Most powerful · Astra + Fable", effort: "high", synthesize: true },
] as const;
export type TierId = (typeof tiers)[number]["id"];
export function getTier(id: string | undefined) {
  return tiers.find((t) => t.id === id) ?? tiers[2];
}
// "Auto" lets Ghost choose a tier per question: short chat → Lite, deep work → Ghost, the rest → Ayna.
export const AUTO_TIER = { id: "auto", name: "Auto", label: "Ghost picks the best tier" } as const;
const deepWork = /```|\b(architect|architecture|design|debug|refactor|security|threat|compare|analy[sz]e|strategy|plan|prove|optimi[sz]e|research|step[- ]by[- ]step|review)\b/i;
export function pickTier(text: string): TierId {
  const t = text.trim();
  if (t.length > 600 || deepWork.test(t)) return "ghost";
  if (t.length <= 80) return "lite";
  return "ayna";
}
// Long-term memory: only facts the user states about themselves or explicitly asks Ghost to remember.
export function extractMemoryFacts(text: string): string[] {
  const facts = new Set<string>();
  for (const raw of text.split(/(?<=[.!?\n።])\s*/)) {
    const line = raw.trim().replace(/[.!?።]+$/, "");
    const remember = line.match(/^(?:please\s+)?remember(?:\s+that)?[:,]?\s+(.{3,})/i) ?? line.match(/^አስታውስ[:፡,]?\s*(.{3,})/);
    if (remember?.[1]) facts.add(remember[1]);
    else if (/\b(my name is|i prefer|i work (at|as)|i live in|i am a|i'm a)\b/i.test(line) && line.length < 200) facts.add(line);
  }
  return [...facts].map((f) => f.slice(0, 300)).slice(0, 5);
}
export const agents = [
  {
    id: "architect",
    name: "Architect",
    label: "Systems & strategy",
    description: "Turn an idea into a clear, actionable blueprint.",
    prompt: "Help me plan the architecture for a new project.",
  },
  {
    id: "coder",
    name: "Coder",
    label: "Software engineering",
    description: "Write, explain, and improve your code.",
    prompt: "Help me build a well-tested TypeScript application.",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    label: "Quality & correctness",
    description: "Find the gaps. Strengthen the details.",
    prompt: "Review my code for correctness and maintainability.",
  },
  {
    id: "defender",
    name: "Defender",
    label: "Defensive security",
    description: "Assess risks and harden systems you own.",
    prompt: "Create a defensive security checklist for my web application.",
  },
  {
    id: "researcher",
    name: "Researcher",
    label: "Knowledge & analysis",
    description: "Explore questions and connect the evidence.",
    prompt: "Help me critically evaluate a research question and identify what evidence I need.",
  },
  {
    id: "arbiter",
    name: "Arbiter",
    label: "Decisions & synthesis",
    description: "Weigh the trade-offs. Find a way forward.",
    prompt: "Help me compare options and make a well-reasoned decision.",
  },
] as const;
export type AgentId = (typeof agents)[number]["id"];
// "Auto" lets Ghost pick the agent perspective from the question itself.
export const AUTO_AGENT = { id: "auto", name: "Auto", label: "Ghost picks the best agent" } as const;
export type AgentChoice = AgentId | "auto";
export function pickAgent(text: string): AgentId {
  const t = text.toLowerCase();
  if (/\b(security|vulnerab|threat|attack|harden|exploit|breach|defend)\b/.test(t)) return "defender";
  if (/\b(code|typescript|javascript|python|react|sql|api|bug|compile|deploy|debug|refactor|function)\b/.test(t)) return "coder";
  if (/\b(review|audit|correct|maintainab|quality|test coverage)\b/.test(t)) return "reviewer";
  if (/\b(decide|decision|trade-?offs?|choose|which option|should i|prioriti[sz]e)\b/.test(t)) return "arbiter";
  if (/\b(research|analy[sz]e|analysis|evidence|study|compare|explain|why|how does)\b/.test(t)) return "researcher";
  return "architect";
}
// Media requests inside chat: the question itself decides whether Ghost creates an image or a video.
export type MediaIntent = { kind: "image" | "video"; prompt: string };
export function detectMediaIntent(text: string): MediaIntent | null {
  const t = text.trim();
  const verb = /\b(generate|create|make|draw|design|render|produce|paint|imagine|show me|build|give me|i want|i need|can you)\b/i.test(t) || /(ፍጠር|ፍጠሪ|ስራ|ስሪ|ሳል|ሳይ|አዘጋጅ)/.test(t);
  const startsNoun = /^(an? )?(image|picture|photo|video|clip|logo|poster)s? (of|for|with|showing)\b/i.test(t);
  if (!verb && !startsNoun) return null;
  if (/\b(video|clip|animation|animated|footage|movie|short film|reel)\b/i.test(t) || /ቪዲዮ/.test(t)) return { kind: "video", prompt: t };
  if (/\b(image|images|picture|pic|photo|artwork|art|drawing|illustration|logo|poster|wallpaper|portrait|diagram|banner|sticker|thumbnail)\b/i.test(t) || /(ምስል|ፎቶ|ስዕል)/.test(t)) return { kind: "image", prompt: t };
  return null;
}
export function ownsThread(owner: string, user: string) {
  return owner === user;
}
export const ghostInstructions = `You are ABISINYA GHOST, a safe, candid assistant for coding, planning, creative writing, learning, translation, and defensive security. You are an orchestrated AI workflow, not a newly trained model. Never claim access to external tools, browsing, local execution, surveillance, medical devices, bank systems, quantum hardware, or any of the speculative abilities in the user's manifest. You have text reasoning only. Distinguish suggestions from executed work. Refuse theft, fraud, malware, destructive intrusion, invasive surveillance, weaponization and harmful biological or physical operations. Offer safe defensive or educational alternatives. Medical information is educational, not diagnosis or treatment. Do not fabricate sources or live facts. Be useful, specific, and use readable markdown. You have a fun side: when asked for a joke, tell genuinely funny ones; when asked to roast someone (including the user), deliver a playful, witty roast — clever, never hateful, never about race, religion, disability or other protected traits. When the user asks to open an app or call someone, the app handles it on their device; briefly confirm.`;

export type PhoneAction = { kind: "open"; app: string; url: string } | { kind: "call"; number: string } | { kind: "sms"; number: string };
const appLinks: Record<string, string> = {
  tiktok: "https://www.tiktok.com/foryou", youtube: "https://m.youtube.com/shorts", instagram: "https://www.instagram.com/reels/",
  facebook: "https://m.facebook.com", telegram: "https://t.me", whatsapp: "https://wa.me", x: "https://x.com", twitter: "https://x.com",
  maps: "https://maps.google.com", "google maps": "https://maps.google.com", gmail: "https://mail.google.com", spotify: "https://open.spotify.com",
  netflix: "https://www.netflix.com", snapchat: "https://www.snapchat.com", linkedin: "https://www.linkedin.com", google: "https://www.google.com",
};
export function detectPhoneAction(text: string): PhoneAction | null {
  const t = text.trim().toLowerCase().replace(/^(hey |ok |my )?ghost[,!.]?\s*/, "");
  const num = t.match(/(\+?\d[\d\s-]{5,}\d)/);
  if (/^(please )?(call|dial|ring|ደውል)/.test(t) && num) return { kind: "call", number: (num[1] ?? "").replace(/[\s-]/g, "") };
  if (/^(please )?(text|sms|message)/.test(t) && num) return { kind: "sms", number: (num[1] ?? "").replace(/[\s-]/g, "") };
  const open = t.match(/^(please )?(open|launch|go to|start|scroll|ክፈት)\s+(?:the\s+)?(.+?)(?:\s+app)?(?:\s+(?:videos?|reels|shorts|and.*))?[.!]?$/);
  if (open) { const app = (open[3] ?? "").trim(); const url = appLinks[app]; if (url) return { kind: "open", app, url }; }
  return null;
}
