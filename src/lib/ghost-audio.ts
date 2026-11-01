export const AUDIO_MODELS = {
  speech: "google/gemini-3.1-flash-tts-preview",
  musicClip: "google/lyria-3-clip-preview",
  musicPro: "google/lyria-3-pro-preview",
  voices: ["Kore", "Puck", "Charon", "Aoede", "Fenrir", "Leda"] as string[],
} as const;

export const MUSIC_PRESETS = [
  { label: "Ethio-jazz", prompt: "Ethio-jazz in the style of 1970s Addis Ababa, vibraphone, brass, groovy bass, pentatonic melody" },
  { label: "Tizita", prompt: "Slow emotional Tizita ballad, krar and masinko, nostalgic Amharic mood" },
  { label: "Eskista beat", prompt: "Energetic Amharic eskista dance beat, kebero drums, fast shoulder-dance rhythm" },
  { label: "Oromo groove", prompt: "Upbeat Oromo music, bouncing rhythm, bright synths and hand drums" },
  { label: "Afrobeats", prompt: "Modern Afrobeats with log drums, smooth groove, summer vibe" },
  { label: "Lo-fi", prompt: "Chill lo-fi hip hop for studying, soft keys, vinyl crackle" },
];
