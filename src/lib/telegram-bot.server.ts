import { createHash, timingSafeEqual } from "crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { GHOST_MODELS, ghostInstructions } from "./ghost";
import { isAllowedTelegramUser, normalizePhone } from "./telegram-access";

const TG = "https://connector-gateway.lovable.dev/telegram";

export function telegramWebhookSecret(connectionKey: string) {
  return createHash("sha256").update(`telegram-webhook:${connectionKey}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const l = Buffer.from(a);
  const r = Buffer.from(b);
  return l.length === r.length && timingSafeEqual(l, r);
}

async function tg(method: string, body: unknown) {
  const res = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["TELEGRAM_API_KEY"] ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`Telegram ${method} failed [${res.status}]: ${await res.text()}`);
}

type Msg = {
  chat: { id: number; type: string };
  from?: { id: number };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

export async function handleTelegramWebhook(request: Request) {
  const connKey = process.env["TELEGRAM_API_KEY"];
  const aiKey = process.env["LOVABLE_API_KEY"];
  if (!connKey || !aiKey) return new Response("Not configured", { status: 503 });
  const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (!safeEqual(got, telegramWebhookSecret(connKey))) return new Response("Unauthorized", { status: 401 });

  const update = (await request.json()) as { update_id?: number; message?: Msg };
  const msg = update.message;
  if (typeof update.update_id !== "number" || !msg?.from || msg.chat.type !== "private") return Response.json({ ok: true });

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Telegram retries deliveries; skip duplicates.
  const { error: dup } = await db.from("telegram_updates").insert({ update_id: update.update_id });
  if (dup) return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const list = process.env["TELEGRAM_ALLOWED_USERS"] ?? "";

  // Phone check: only accept the sender's own shared contact.
  if (msg.contact) {
    if (msg.contact.user_id === userId && isAllowedTelegramUser(list, userId, msg.contact.phone_number)) {
      await db.from("telegram_verified").upsert({ telegram_id: userId, phone: normalizePhone(msg.contact.phone_number) });
      await tg("sendMessage", { chat_id: chatId, text: "✅ Verified. Ask Ghost anything.", reply_markup: { remove_keyboard: true } });
    } else {
      await tg("sendMessage", { chat_id: chatId, text: "Sorry, this number isn't allowed to use Ghost.", reply_markup: { remove_keyboard: true } });
    }
    return Response.json({ ok: true });
  }

  const { data: verified } = await db.from("telegram_verified").select("phone").eq("telegram_id", userId).maybeSingle();
  if (!isAllowedTelegramUser(list, userId, verified?.phone)) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: `👻 Ghost is private. Share your phone number to check access.\nYour Telegram ID: ${userId}`,
      reply_markup: { keyboard: [[{ text: "📱 Share my number", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
    return Response.json({ ok: true });
  }

  const text = msg.text?.trim();
  if (!text) {
    await tg("sendMessage", { chat_id: chatId, text: "Send me a text message 🙂" });
    return Response.json({ ok: true });
  }
  if (text === "/start") {
    await tg("sendMessage", { chat_id: chatId, text: "👻 Hi, I'm Ghost. Ask me anything." });
    return Response.json({ ok: true });
  }
  if (text === "/new") {
    await db.from("telegram_history").delete().eq("chat_id", chatId);
    await tg("sendMessage", { chat_id: chatId, text: "Started a fresh chat." });
    return Response.json({ ok: true });
  }

  await tg("sendChatAction", { chat_id: chatId, action: "typing" });
  const { data: past } = await db
    .from("telegram_history")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(12);
  const history = (past ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply = "Ghost couldn't answer right now. Try again in a moment.";
  try {
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: aiKey,
      headers: { "Lovable-API-Key": aiKey },
    });
    const result = await generateText({
      model: provider.responses(GHOST_MODELS.draft),
      system: `${ghostInstructions}\nYou are replying inside Telegram. Keep answers concise and use plain text or simple Markdown. You cannot open apps or make calls from Telegram.`,
      messages: [...history, { role: "user", content: text }],
      maxRetries: 0,
      providerOptions: { openai: { store: false, reasoningEffort: "medium" } },
    });
    if (result.text.trim()) reply = result.text.trim();
  } catch (e) {
    console.error("Telegram AI reply failed", e);
  }

  await db.from("telegram_history").insert([
    { chat_id: chatId, role: "user", content: text.slice(0, 8000) },
    { chat_id: chatId, role: "assistant", content: reply.slice(0, 8000) },
  ]);
  for (let i = 0; i < reply.length; i += 4000) await tg("sendMessage", { chat_id: chatId, text: reply.slice(i, i + 4000) });
  return Response.json({ ok: true });
}
