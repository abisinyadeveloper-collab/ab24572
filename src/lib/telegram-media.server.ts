import { createParser } from "eventsource-parser";
import { MEDIA_MODELS } from "./ghost-media";
import { assertMediaAvailable, recordMediaBlock } from "./ghost-media.server";
import { createVideo, pollVideo, VideoGatewayError } from "./video-jobs.server";
import { telegramSendFile } from "./telegram-client.server";

async function gatewayError(response: Response, model: string) {
  const body = await response.text();
  let reason = body;
  try { const data = JSON.parse(body); reason = data.message ?? data.error?.message ?? body; } catch { /* retain status text */ }
  await recordMediaBlock(model, response.status, reason);
  throw new VideoGatewayError(response.status, reason);
}
export async function telegramImage(chatId: number, updateId: number, prompt: string, image?: File) {
  const key = await assertMediaAvailable(MEDIA_MODELS.image);
  let body: string | FormData;
  if (image) {
    const form = new FormData(); form.set("model", MEDIA_MODELS.image); form.set("prompt", prompt); form.set("image", image); form.set("stream", "true"); form.set("partial_images", "1"); body = form;
  } else body = JSON.stringify({ model: MEDIA_MODELS.image, prompt, stream: true, partial_images: 1 });
  const response = await fetch(`https://ai.gateway.lovable.dev/v1/images/${image ? "edits" : "generations"}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, ...(image ? {} : { "Content-Type": "application/json" }) }, body });
  if (!response.ok) return gatewayError(response, MEDIA_MODELS.image);
  let final: string | undefined, failure: string | undefined, status = 400;
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    if (!response.body) throw new Error("Image response was empty.");
    const parser = createParser({ onEvent(event) {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      const type = event.event || data.type;
      if (type === "error" || data.type === "error") { failure = data.error?.message ?? data.message ?? "Image creation failed."; status = data.status ?? data.error?.status ?? 400; }
      if (type === "image_generation.completed" || type === "image_edit.completed") final = data.b64_json;
    } });
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) { const chunk = await reader.read(); if (chunk.done) break; parser.feed(chunk.value); }
  } else final = (await response.json() as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
  if (failure) { await recordMediaBlock(MEDIA_MODELS.image, status, failure); throw new VideoGatewayError(status, failure); }
  if (!final) throw new Error("Image creation ended without a finished image. No new generation was started.");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const path = `telegram/${chatId}/${updateId}.png`;
  const file = new File([Buffer.from(final, "base64")], "ghost.png", { type: "image/png" });
  const { error } = await db.storage.from("ghost-media").upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error("The image finished but could not be saved.");
  const { error: saved } = await db.from("telegram_media").insert({ telegram_id: chatId, update_id: updateId, kind: "image", prompt, path, status: "completed" });
  if (saved) throw new Error("Could not save the image record.");
  await telegramSendFile(chatId, file, "document", "Created by Ghost");
}
export async function telegramStartVideo(chatId: number, updateId: number, prompt: string, image?: File) {
  const key = await assertMediaAvailable(MEDIA_MODELS.video);
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await db.from("telegram_media").insert({ telegram_id: chatId, update_id: updateId, kind: "video", prompt, status: "queued" }).select("id").single();
  if (error || !row) throw new Error(error?.code === "23505" ? "A Telegram video is already generating. Wait for it to finish and check /status before requesting another." : "Could not save the video request.");
  try {
    // Do not start a second job while a website video is active either.
    const { data: active, error: activeError } = await db.from("ghost_media").select("id").eq("kind", "video").in("status", ["queued", "in_progress"]).limit(1);
    if (activeError) throw new Error("Unable to check video availability.");
    if (active?.length) throw new Error("Another Ghost video is generating. Wait for it to finish.");
    const input = image ? [{ type: "text", text: prompt }, { type: "image", data: Buffer.from(await image.arrayBuffer()).toString("base64"), mime_type: image.type }] : prompt;
    const job = await createVideo({ apiKey: key, baseURL: "https://ai.gateway.lovable.dev", model: MEDIA_MODELS.video }, { input, response_format: { type: "video", resolution: "720p", duration: "5s", aspect_ratio: "16:9" } });
    const { error: saved } = await db.from("telegram_media").update({ gateway_id: job.id, status: job.status, error: job.error?.message ?? null }).eq("id", row.id);
    if (saved) throw new Error("Unable to save video progress.");
    return row.id;
  } catch (error) {
    await db.from("telegram_media").update({ status: "failed", error: error instanceof Error ? error.message : "Video creation failed." }).eq("id", row.id);
    if (error instanceof VideoGatewayError) await recordMediaBlock(MEDIA_MODELS.video, error.status, error.message);
    throw error;
  }
}
export async function telegramVideoStatus(chatId: number) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await db.from("telegram_media").select("*").eq("telegram_id", chatId).eq("kind", "video").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Unable to read video progress.");
  if (!row) return "You haven't requested a video yet.";
  if (row.status === "failed") return row.error ?? "Video creation failed.";
  let path = row.path;
  if (!path && row.gateway_id) {
    const key = await assertMediaAvailable(MEDIA_MODELS.video);
    try {
      const job = await pollVideo({ apiKey: key, baseURL: "https://ai.gateway.lovable.dev", model: MEDIA_MODELS.video }, row.gateway_id);
      if (job.status === "failed") { await db.from("telegram_media").update({ status: "failed", error: job.error?.message ?? null }).eq("id", row.id); return job.error?.message ?? "Video creation failed."; }
      if (job.status !== "completed") return "Your video is still generating. Send /status again shortly.";
      const content = await fetch(`https://ai.gateway.lovable.dev/v1/videos/${encodeURIComponent(row.gateway_id)}/content`, { headers: { Authorization: `Bearer ${key}` } });
      if (!content.ok) return gatewayError(content, MEDIA_MODELS.video);
      path = `telegram/${chatId}/${row.id}.mp4`;
      const { error: upload } = await db.storage.from("ghost-media").upload(path, await content.blob(), { contentType: "video/mp4", upsert: true });
      if (upload) throw new Error("Video is ready but couldn't be saved. Check /status again.");
      const { error: saved } = await db.from("telegram_media").update({ status: "completed", path }).eq("id", row.id);
      if (saved) throw new Error("Unable to save the finished video.");
    } catch (error) { if (error instanceof VideoGatewayError) await recordMediaBlock(MEDIA_MODELS.video, error.status, error.message); throw error; }
  }
  if (!path) return "Video progress is unavailable. No replacement generation has been started.";
  const { data: file, error: download } = await db.storage.from("ghost-media").download(path);
  if (download || !file) throw new Error("Unable to retrieve your saved video.");
  await telegramSendFile(chatId, new File([file], "ghost.mp4", { type: "video/mp4" }), "video", "Created by Ghost");
  return "Your video is ready.";
}