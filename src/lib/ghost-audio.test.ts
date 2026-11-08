import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), available: vi.fn(), block: vi.fn() }));
vi.mock("./ghost-media.server", () => ({
  authenticateMedia: mocks.authenticate, assertMediaAvailable: mocks.available, recordMediaBlock: mocks.block,
  mediaError: (error: Error & { status?: number }) => Response.json({ message: error.message }, { status: error.status ?? 500 }),
}));
import { handleGhostMusic } from "./ghost-audio.server";
const id = "11111111-1111-4111-8111-111111111111";
describe("Ghost music generation", () => {
  const insert = vi.fn(), update = vi.fn(), upload = vi.fn(), remove = vi.fn(), read = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    upload.mockResolvedValue({ error: null });
    mocks.available.mockResolvedValue("test-key");
    mocks.authenticate.mockResolvedValue({ userId: "owner", db: {
      from: () => ({ insert, update, select: () => ({ eq: () => ({ eq: () => ({ single: read }) }) }) }),
      storage: { from: () => ({ upload, remove }) },
    } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([73, 68, 51, 1]), { headers: { "Content-Type": "audio/mpeg" } })));
  });
  const request = (extra = {}) => new Request("http://localhost/api/music", { method: "POST", body: JSON.stringify({ requestId: id, prompt: "Instrumental Ethio-jazz", ...extra }) });
  it("claims music before the paid call and saves the same MP3 for playback", async () => {
    const response = await handleGhostMusic(request());
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id, kind: "music", user_id: "owner", status: "in_progress" }));
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetch).mock.invocationCallOrder[0] ?? 0);
    expect(upload).toHaveBeenCalledWith(`owner/${id}.mp3`, expect.any(ArrayBuffer), { contentType: "audio/mpeg" });
    expect(await response.json()).toEqual({ id, path: `owner/${id}.mp3`, status: "completed" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("never bills when the music library claim fails", async () => {
    insert.mockResolvedValue({ error: { code: "23514" } });
    expect((await handleGhostMusic(request())).status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reuses a completed duplicate request without another generation", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    read.mockResolvedValue({ data: { id, path: `owner/${id}.mp3`, status: "completed", error: null } });
    expect((await handleGhostMusic(request())).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the explicit full-song model and documented input contract", async () => {
    await handleGhostMusic(request({ length: "full", vocals: true, lyrics: "Hello world" }));
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("google/lyria-3-pro-preview");
    expect(body.input[0].content[0].text).toContain("Hello world");
  });
  it("persists credit failures and returns the original safe message", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ message: "Please add credits" }, { status: 402 }));
    const response = await handleGhostMusic(request());
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ message: "Please add credits" });
    expect(mocks.block).toHaveBeenCalledWith("google/lyria-3-clip-preview", 402, "Please add credits");
    expect(update).toHaveBeenCalledWith({ status: "failed", error: "Please add credits" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});