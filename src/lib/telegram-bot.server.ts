import { createHash, timingSafeEqual } from "crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { GHOST_MODELS, ghostInstructions } from "./ghost";
import { telegramUserId } from "./telegram-access";

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
  if (!res.ok) {
    const body = await res.text();
    console.error(`Telegram ${method} failed [${res.status}]: ${body}`);
    throw new Error(`Telegram request failed [${res.status}]: ${body}`);
  }
  const data = await res.json() as { ok?: boolean; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description ?? "Unknown error"}`);
}

type Msg = {
  chat: { id: number; type: string };
  from?: { id: number; is_bot?: boolean };
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
  const userId = msg ? telegramUserId(msg) : null;
  if (!Number.isSafeInteger(update.update_id) || !msg || userId === null || typeof update.update_id !== "number") return Response.json({ ok: true });

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Telegram retries deliveries; skip duplicates.
  const { error: dup } = await db.from("telegram_updates").insert({ update_id: update.update_id });
  if (dup?.code === "23505") return Response.json({ ok: true });
  if (dup) return Response.json({ error: dup.message }, { status: 500 });

  const chatId = userId;
  const { error: registrationError } = await db.from("telegram_users").upsert({ telegram_id: userId }, { onConflict: "telegram_id", ignoreDuplicates: true });
  if (registrationError) return Response.json({ error: registrationError.message }, { status: 500 });

  if (msg.contact) {
    await tg("sendMessage", { chat_id: chatId, text: "No phone number is needed. Your Telegram account is ready — ask Ghost anything.", reply_markup: { remove_keyboard: true } });
    return Response.json({ ok: true });
  }

  const text = msg.text?.trim();
  if (!text) {
    await tg("sendMessage", { chat_id: chatId, text: "Send me a text message 🙂" });
    return Response.json({ ok: true });
  }
  if (text === "/start") {
    await tg("sendMessage", { chat_id: chatId, text: `👻 Hi, I'm Ghost. You're signed in with your Telegram account.\nYour Telegram ID: ${userId}\nAsk me anything, or use /new for a fresh chat.`, reply_markup: { remove_keyboard: true } });
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
