import { authenticateMedia, assertMediaAvailable, recordMediaBlock, mediaError } from "./ghost-media.server";
import { VideoGatewayError } from "./video-jobs.server";
import { AUDIO_MODELS } from "./ghost-audio";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function failed(model: string, upstream: Response, fallback: string) {
  const body = await upstream.json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
  const message = body?.message ?? body?.error?.message ?? fallback;
  await recordMediaBlock(model, upstream.status, message);
  return Response.json({ message }, { status: upstream.status });
}

// Ghost voice: Gemini TTS returns a complete WAV for one message.
export async function handleGhostSpeech(request: Request) {
  try {
    await authenticateMedia(request);
    const input = await request.json() as { text?: string; voice?: string };
    const text = typeof input.text === "string" ? input.text.trim() : "";
    if (!text || text.length > 5000) throw new VideoGatewayError(400, "Ghost can read up to 5,000 characters at a time.");
    const voice = typeof input.voice === "string" && AUDIO_MODELS.voices.includes(input.voice) ? input.voice : "Kore";
    const key = await assertMediaAvailable(AUDIO_MODELS.speech);
    const upstream = await fetch(`${GATEWAY}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AUDIO_MODELS.speech,
        contents: [{ role: "user", parts: [{ text: `Read this naturally, with native pronunciation for whatever language it is written in (Amharic, Afaan Oromoo, Tigrinya, Somali or English):\n${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    if (!upstream.ok) return failed(AUDIO_MODELS.speech, upstream, "Ghost voice is unavailable right now.");
    return new Response(upstream.body, { headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav", "Cache-Control": "no-store" } });
  } catch (error) { return mediaError(error); }
}

// Music: one Lyria generation per Generate press, saved to the caller's private library.
export async function handleGhostMusic(request: Request) {
  let markFailed: ((message: string) => Promise<void>) | undefined;
  try {
    const { db, userId } = await authenticateMedia(request);
    const input = await request.json() as { prompt?: string; length?: string; vocals?: boolean; lyrics?: string; requestId?: string };
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    if (!prompt || prompt.length > 3000) throw new VideoGatewayError(400, "Describe your song in under 3,000 characters.");
    const lyrics = typeof input.lyrics === "string" ? input.lyrics.trim().slice(0, 3000) : "";
    const full = input.length === "full";
    const model = full ? AUDIO_MODELS.musicPro : AUDIO_MODELS.musicClip;
    const key = await assertMediaAvailable(model);
    const id = input.requestId ?? crypto.randomUUID();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new VideoGatewayError(400, "Invalid music request.");
    // Claim before generating; duplicate HTTP submissions never create a second paid recording.
    const { error: claim } = await db.from("ghost_media").insert({ id, user_id: userId, kind: "music", prompt, status: "in_progress" });
    if (claim) {
      if (claim.code === "23505") {
        const { data: existing } = await db.from("ghost_media").select("id,path,status,error").eq("id", id).eq("user_id", userId).single();
        if (existing) return Response.json(existing, { status: existing.status === "failed" ? 409 : existing.status === "completed" ? 200 : 202 });
      }
      throw new VideoGatewayError(500, "Could not save your music request. No track was generated.");
    }
    markFailed = async message => { await db.from("ghost_media").update({ status: "failed", error: message }).eq("id", id); };
    const text = [
      prompt,
      input.vocals ? (lyrics ? `Sing these lyrics:\n${lyrics}` : "Include sung vocals with fitting lyrics.") : "Instrumental only, no vocals.",
      full ? "Length: about 2 to 3 minutes with intro, verses, chorus and outro." : "",
    ].filter(Boolean).join("\n\n");
    const upstream = await fetch(`${GATEWAY}/music`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: [{ type: "user_input", content: [{ type: "text", text }] }] }),
    });
    if (!upstream.ok) {
      const response = await failed(model, upstream, "Music creation is unavailable right now.");
      const body = await response.clone().json() as { message: string };
      await markFailed(body.message);
      return response;
    }
    const audio = await upstream.arrayBuffer();
    if (!audio.byteLength) throw new VideoGatewayError(502, "Ghost returned an empty track. Please try again.");
    const path = `${userId}/${id}.mp3`;
    const { error: upload } = await db.storage.from("ghost-media").upload(path, audio, { contentType: "audio/mpeg" });
    if (upload) throw new VideoGatewayError(500, "Your track was created but could not be saved.");
    const { error } = await db.from("ghost_media").update({ path, status: "completed" }).eq("id", id);
    if (error) {
      await db.storage.from("ghost-media").remove([path]);
      throw new VideoGatewayError(500, "Your track was created but could not be added to your library.");
    }
    return Response.json({ id, path, status: "completed" });
  } catch (error) {
    await markFailed?.(error instanceof Error ? error.message : "Music creation failed.");
    return mediaError(error);
  }
}
