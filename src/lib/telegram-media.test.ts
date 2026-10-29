import { afterEach, describe, expect, it, vi } from "vitest";
import { telegramVideoStatus } from "./telegram-media.server";
const mocks = vi.hoisted(() => ({ eq: vi.fn(), maybeSingle: vi.fn(), download: vi.fn(), send: vi.fn() }));
vi.mock("./telegram-client.server", () => ({ telegramSendFile: mocks.send }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => {
    const query = { select: () => query, eq: mocks.eq, order: () => query, limit: () => query, maybeSingle: mocks.maybeSingle };
    mocks.eq.mockReturnValue(query); return query;
  },
  storage: { from: () => ({ download: mocks.download }) },
} }));
afterEach(() => vi.clearAllMocks());
describe("Telegram video privacy", () => {
  it("looks up only the requesting sender's video", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await telegramVideoStatus(42)).toBe("You haven't requested a video yet.");
    expect(mocks.eq).toHaveBeenCalledWith("telegram_id", 42);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("surfaces failed jobs without recreating or downloading", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { status: "failed", error: "The video was declined." }, error: null });
    expect(await telegramVideoStatus(43)).toBe("The video was declined.");
    expect(mocks.download).not.toHaveBeenCalled();
  });
});