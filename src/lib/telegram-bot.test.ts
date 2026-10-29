import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTelegramWebhook, telegramWebhookSecret } from "./telegram-bot.server";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), upsert: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => {
    if (table === "telegram_updates") return { insert: mocks.insert };
    if (table === "telegram_users") return { upsert: mocks.upsert };
    return { delete: mocks.remove };
  } },
}));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Telegram public onboarding", () => {
  it("registers two new IDs without phone or website login and resets only the caller's history", async () => {
    vi.stubEnv("TELEGRAM_API_KEY", "test-connection");
    vi.stubEnv("LOVABLE_API_KEY", "test-ai");
    vi.stubEnv("TELEGRAM_ALLOWED_USERS", "999"); // old list must not restrict access
    mocks.insert.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.remove.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ error: null });
    const send = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    // Response bodies are single-use; create one per outgoing call.
    send.mockImplementation(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", send);
    const request = (id: number, text: string) => new Request("http://localhost/api/public/telegram/webhook", {
      method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": telegramWebhookSecret("test-connection") },
      body: JSON.stringify({ update_id: id + (text === "/new" ? 1000 : 0), message: { from: { id }, chat: { id, type: "private" }, text } }),
    });
    for (const id of [42, 43]) expect((await handleTelegramWebhook(request(id, "/start"))).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ telegram_id: 42 }, expect.any(Object));
    expect(mocks.upsert).toHaveBeenCalledWith({ telegram_id: 43 }, expect.any(Object));
    const sent = send.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(sent.map((body) => body.chat_id)).toEqual([42, 43]);
    await handleTelegramWebhook(request(42, "/new"));
    expect(mocks.eq).toHaveBeenCalledExactlyOnceWith("chat_id", 42);
  });
  it("refuses an unsigned request before any user registration", async () => {
    vi.stubEnv("TELEGRAM_API_KEY", "test-connection");
    vi.stubEnv("LOVABLE_API_KEY", "test-ai");
    const response = await handleTelegramWebhook(new Request("http://localhost/api/public/telegram/webhook", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});