import { deviceLabel, emailTime, PASSWORD_NOTICE_COOLDOWN_MS, shouldAlertSignIn, shouldSendWelcome } from "./ghost-notify";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function send(template: string, to: string, key: string, data: Record<string, unknown> = {}) {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  try {
    return await sendTemplateEmail(template, to, { templateData: data, idempotencyKey: key });
  } catch (error) {
    // Notifications are best-effort: never break sign-in or video delivery because an email failed.
    console.error(`[ghost-notify] ${template} failed`, error);
    return { sent: false as const, reason: "error" as const };
  }
}

export async function notificationsEnabled(userId: string) {
  const db = await admin();
  const { data } = await db.from("profiles").select("email_notifications").eq("id", userId).maybeSingle();
  return data?.email_notifications ?? true;
}

async function account(userId: string) {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user;
}

async function displayName(userId: string) {
  const db = await admin();
  const { data } = await db.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return data?.display_name || undefined;
}

export async function handleSignIn(userId: string, deviceId: string, userAgent: string) {
  const db = await admin();
  const user = await account(userId);
  if (!user?.email) return { welcome: false, alert: false };

  await db.from("ghost_notify_state").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: state } = await db.from("ghost_notify_state").select("welcome_sent_at").eq("user_id", userId).single();

  let welcome = false;
  if (shouldSendWelcome({ confirmed: Boolean(user.email_confirmed_at), createdAt: user.created_at, alreadySent: Boolean(state?.welcome_sent_at) })) {
    // Claim the welcome first so two tabs can't both send it.
    const { data: claimed } = await db.from("ghost_notify_state").update({ welcome_sent_at: new Date().toISOString() })
      .eq("user_id", userId).is("welcome_sent_at", null).select("user_id");
    if (claimed?.length) {
      welcome = true;
      await send("welcome", user.email, `welcome-${userId}`, { name: await displayName(userId) });
    }
  }

  const { data: devices } = await db.from("ghost_devices").select("device_id").eq("user_id", userId);
  const known = devices ?? [];
  const deviceKnown = known.some((d) => d.device_id === deviceId);
  const label = deviceLabel(userAgent);
  if (deviceKnown) {
    await db.from("ghost_devices").update({ last_seen_at: new Date().toISOString() }).eq("user_id", userId).eq("device_id", deviceId);
    return { welcome, alert: false };
  }
  const { error } = await db.from("ghost_devices").insert({ user_id: userId, device_id: deviceId, label });
  if (error) return { welcome, alert: false }; // another tab registered it first
  const alert = shouldAlertSignIn({ deviceKnown, knownDevices: known.length, enabled: await notificationsEnabled(userId) });
  if (alert) await send("new-sign-in", user.email, `sign-in-${userId}-${deviceId}`, { device: label, time: emailTime() });
  return { welcome, alert };
}

export async function handlePasswordChanged(userId: string) {
  const db = await admin();
  const user = await account(userId);
  if (!user?.email) return { sent: false };
  await db.from("ghost_notify_state").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const cutoff = new Date(Date.now() - PASSWORD_NOTICE_COOLDOWN_MS).toISOString();
  const now = new Date().toISOString();
  const { data: claimed } = await db.from("ghost_notify_state").update({ password_notified_at: now })
    .eq("user_id", userId).or(`password_notified_at.is.null,password_notified_at.lt.${cutoff}`).select("user_id");
  if (!claimed?.length) return { sent: false };
  // Security notice: always sent, regardless of the notifications switch.
  await send("password-changed", user.email, `password-${userId}-${now}`, { time: emailTime() });
  return { sent: true };
}

/** Background sweep: finishes pending videos and emails owners who aren't watching the app. */
export async function sweepVideos(limit = 10) {
  const db = await admin();
  const { checkGhostVideo } = await import("./ghost-media.server");
  const { data: pending } = await db.from("ghost_media").select("id,user_id")
    .eq("kind", "video").in("status", ["queued", "in_progress"]).not("gateway_id", "is", null)
    .lt("created_at", new Date(Date.now() - 30_000).toISOString())
    .order("created_at").limit(limit);
  let emailed = 0;
  for (const row of pending ?? []) {
    try {
      const result = await checkGhostVideo(row.user_id, row.id, "background");
      if (result.status !== "completed") continue;
      const { data: claimed } = await db.from("ghost_media").update({ notified_at: new Date().toISOString() })
        .eq("id", row.id).is("notified_at", null).select("id,prompt");
      if (!claimed?.length || !(await notificationsEnabled(row.user_id))) continue;
      const user = await account(row.user_id);
      if (!user?.email) continue;
      const r = await send("video-ready", user.email, `video-ready-${row.id}`, { prompt: claimed[0].prompt });
      if (r.sent) emailed++;
    } catch (error) {
      console.error("[ghost-notify] video sweep", row.id, error);
    }
  }
  return { checked: pending?.length ?? 0, emailed };
}
