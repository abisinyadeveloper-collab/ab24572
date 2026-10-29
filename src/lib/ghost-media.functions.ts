import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const generateGhostVideo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ prompt: z.string().trim().min(1).max(10000), resolution: z.enum(["720p","1080p","4k"]), duration: z.enum(["3s","5s","8s","10s"]), aspectRatio: z.enum(["16:9","9:16"]) })).handler(async ({ data, context }) => {
  const { startGhostVideo } = await import("./ghost-media.server");
  return startGhostVideo(context.userId, data.prompt, data.resolution, data.duration, data.aspectRatio);
});
export const pollGhostVideo = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const { checkGhostVideo } = await import("./ghost-media.server");
  return checkGhostVideo(context.userId, data.id);
});