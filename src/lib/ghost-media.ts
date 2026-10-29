export const MEDIA_MODELS = { image: "openai/gpt-image-2.5-sunburst", video: "google/gemini-omni-1.1-flash" } as const;
export const voiceLanguages = [
  { id: "am", name: "አማርኛ · Amharic", greeting: "ሰላም! እኔ ጎስት ነኝ። ዛሬ በምን ልረዳዎት?" },
  { id: "en", name: "English", greeting: "Hello, I’m Ghost. What can I help you with today?" },
  { id: "sw", name: "Kiswahili", greeting: "Habari! Mimi ni Ghost. Nikusaidie nini leo?" },
  { id: "ar", name: "العربية · Arabic", greeting: "مرحباً، أنا غوست. كيف يمكنني مساعدتك اليوم؟" },
  { id: "fr", name: "Français", greeting: "Bonjour, je suis Ghost. Comment puis-je vous aider aujourd’hui ?" },
  { id: "es", name: "Español", greeting: "Hola, soy Ghost. ¿En qué puedo ayudarte hoy?" },
] as const;
export function getVoiceLanguage(id?: string) { return voiceLanguages.find(l => l.id === id) ?? voiceLanguages[0]; }
export function ownsMediaPath(userId: string, path: string) { return path.startsWith(`${userId}/`) && !path.includes(".."); }