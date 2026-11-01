import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const registerGhostSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ deviceId: z.string().regex(/^[A-Za-z0-9-]{8,80}$/), userAgent: z.string().max(400) }))
  .handler(async ({ data, context }) => {
    const { handleSignIn } = await import("./ghost-notify.server");
    return handleSignIn(context.userId, data.deviceId, data.userAgent);
  });

export const notifyGhostPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { handlePasswordChanged } = await import("./ghost-notify.server");
    return handlePasswordChanged(context.userId);
  });
