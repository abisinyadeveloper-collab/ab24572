import { createClient } from "@supabase/supabase-js";
import { MEDIA_MODELS } from "./ghost-media";
import { createVideo, pollVideo, VideoGatewayError } from "./video-jobs.server";
import type { Database } from "@/integrations/supabase/types";
import { loadUserMemories } from "./ghost-memory.server";
import { personalizeMediaPrompt } from "./ghost-memory";

export async function authenticateMedia(request: Request) {
  const token = request.headers.get("authorization");
  const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token?.startsWith("Bearer ") || !url || !key) throw new VideoGatewayError(401, "Sign in to create with Ghost.");
  const db = createClient<Database>(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: token }, fetch: (input, init) => { const headers = new Headers(init?.headers); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
  const { data, error } = await db.auth.getUser(token.slice(7));
  if (error || !data.user) throw new VideoGatewayError(401, "Your session expired. Please sign in again.");
  return { db, userId: data.user.id };
}
export async function assertMediaAvailable(model: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("ghost_ai_blocks").select("reason,status").eq("model", model).maybeSingle();
  if (error) throw new VideoGatewayError(503, "Unable to check AI availability.");
  if (data) throw new VideoGatewayError(data.status, data.reason);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new VideoGatewayError(503, "AI configuration needs attention.");
  return key;
}
export async function recordMediaBlock(model: string, status: number, reason: string) {
  if (status !== 402 && status !== 403) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("ghost_ai_blocks").upsert({ model, status, reason });
  if (error) throw new Error("Could not save AI availability state.");
}
export function mediaError(error: unknown) {
  return Response.json({ message: error instanceof Error ? error.message : "Ghost could not complete this request." }, { status: error instanceof VideoGatewayError ? error.status : 500 });
}
export async function handleGhostImage(request: Request) {
  try {
    const { db, userId } = await authenticateMedia(request);
    const memories = await loadUserMemories(db, userId);
    const key = await assertMediaAvailable(MEDIA_MODELS.image);
    const editing = request.headers.get("content-type")?.includes("multipart/form-data");
    let body: FormData | string;
    if (editing) {
      const form = await request.formData();
      const image = form.get("image");
      if (!(image instanceof File) || !["image/png","image/jpeg","image/webp"].includes(image.type)) throw new VideoGatewayError(400, "Choose a PNG, JPEG, or WebP image.");
      if (image.size > 20 * 1024 * 1024) throw new VideoGatewayError(400, "Choose an image under 20 MB.");
      const prompt = form.get("prompt");
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 10000) throw new VideoGatewayError(400, "Add an edit instruction under 10,000 characters.");
      const stream = form.get("stream") !== "false";
      const safe = new FormData();
      for (const name of ["prompt", "size", "quality"]) { const v = form.get(name); if (typeof v === "string") safe.set(name, v); }
      safe.set("prompt", personalizeMediaPrompt(prompt, memories));
      safe.set("image", image); safe.set("model", MEDIA_MODELS.image);
      if (stream) { safe.set("stream", "true"); safe.set("partial_images", "1"); }
      body = safe;
    } else {
      const input = await request.json() as { prompt?: string; size?: string; quality?: string; stream?: boolean };
      if (typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 10000) throw new VideoGatewayError(400, "Add a prompt under 10,000 characters.");
      body = JSON.stringify({ model: MEDIA_MODELS.image, prompt: personalizeMediaPrompt(input.prompt, memories), size: input.size ?? "1024x1024", quality: input.quality ?? "high", ...(input.stream === false ? {} : { stream: true, partial_images: 1 }) });
    }
    const upstream = await fetch(`https://ai.gateway.lovable.dev/v1/images/${editing ? "edits" : "generations"}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, ...(editing ? {} : { "Content-Type": "application/json" }) }, body });
    if (!upstream.ok) {
      const error = await upstream.clone().json().catch(() => null);
      await recordMediaBlock(MEDIA_MODELS.image, upstream.status, error?.message ?? error?.error?.message ?? "Image creation is unavailable.");
    }
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" } });
  } catch (error) { return mediaError(error); }
}

export async function startGhostVideo(userId: string, prompt: string, resolution: string, duration: string, aspectRatio: string) {
  const key = await assertMediaAvailable(MEDIA_MODELS.video);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("ghost_media").insert({ user_id: userId, kind: "video", prompt, status: "queued" }).select("id").single();
  if (error || !row) throw new Error(error?.code === "23505" ? "A video is already generating. Wait for it to finish before creating another." : "Could not save your video request.");
  try {
    const job = await createVideo({ baseURL: "https://ai.gateway.lovable.dev", apiKey: key, model: MEDIA_MODELS.video }, { input: prompt, response_format: { type: "video", resolution, duration, aspect_ratio: aspectRatio } });
    const { error: saved } = await supabaseAdmin.from("ghost_media").update({ gateway_id: job.id, status: job.status }).eq("id", row.id);
    if (saved) throw new Error("Could not save video progress.");
    return { id: row.id };
  } catch (error) {
    await supabaseAdmin.from("ghost_media").update({ status: "failed", error: error instanceof Error ? error.message : "Video creation failed." }).eq("id", row.id);
    if (error instanceof VideoGatewayError) await recordMediaBlock(MEDIA_MODELS.video, error.status, error.message);
    throw error;
  }
}
export async function checkGhostVideo(userId: string, id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("ghost_media").select("*").eq("id", id).eq("user_id", userId).single();
  if (error || !row) throw new Error("Video not found.");
  if (row.status === "completed" || row.status === "failed" || !row.gateway_id) return row;
  const key = await assertMediaAvailable(MEDIA_MODELS.video);
  const config = { baseURL: "https://ai.gateway.lovable.dev", apiKey: key, model: MEDIA_MODELS.video };
  try {
    const job = await pollVideo(config, row.gateway_id);
    let path = row.path;
    if (job.status === "completed") {
      path = `${userId}/${row.id}.mp4`;
      const { data: exists } = await supabaseAdmin.storage.from("ghost-media").list(userId, { search: `${row.id}.mp4` });
      if (!exists?.some(f => f.name === `${row.id}.mp4`)) {
        const response = await fetch(`${config.baseURL}/v1/videos/${encodeURIComponent(job.id)}/content`, { headers: { Authorization: `Bearer ${key}` } });
        if (!response.ok) throw new Error(`Video download failed (${response.status}).`);
        const { error: upload } = await supabaseAdmin.storage.from("ghost-media").upload(path, await response.blob(), { contentType: "video/mp4", upsert: true });
        if (upload) throw new Error("Your video is ready but could not be saved. Check again.");
      }
    }
    const update = { status: job.status, path, error: job.error?.message ?? null };
    const { error: saved } = await supabaseAdmin.from("ghost_media").update(update).eq("id", row.id);
    if (saved) throw new Error("Could not save video progress.");
    return { ...row, ...update };
  } catch (error) { if (error instanceof VideoGatewayError) await recordMediaBlock(MEDIA_MODELS.video, error.status, error.message); throw error; }
}