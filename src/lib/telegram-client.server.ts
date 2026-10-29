const TG = "https://connector-gateway.lovable.dev/telegram";
function headers() {
  const key = process.env["LOVABLE_API_KEY"], connection = process.env["TELEGRAM_API_KEY"];
  if (!key || !connection) throw new Error("Telegram configuration needs attention.");
  return { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection };
}
export async function telegramCall<T = unknown>(method: string, body: object | FormData): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch(`${TG}/${method}`, { method: "POST", headers: { ...headers(), ...(multipart ? {} : { "Content-Type": "application/json" }) }, body: multipart ? body : JSON.stringify(body) });
  if (!response.ok) throw new Error(`Telegram request failed [${response.status}]: ${await response.text()}`);
  const data = await response.json() as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(data.description ?? "Telegram could not complete this request.");
  return data.result;
}
export async function telegramDownload(fileId: string, filename: string, mime: string, size?: number) {
  if (size && size > 20 * 1024 * 1024) throw new Error("Telegram downloads are limited to 20 MB. Send a smaller file.");
  const info = await telegramCall<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
  if (!info.file_path || (info.file_size ?? 0) > 20 * 1024 * 1024) throw new Error("This Telegram file cannot be downloaded. Choose a file under 20 MB.");
  const response = await fetch(`${TG}/file/${info.file_path}`, { headers: headers() });
  if (!response.ok) throw new Error(`Telegram download failed [${response.status}].`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("This file is too large.");
  return new File([bytes], filename, { type: mime });
}
export async function telegramSendFile(chatId: number, file: File, kind: "photo" | "video" | "document", caption: string) {
  const form = new FormData();
  form.set("chat_id", String(chatId)); form.set("caption", caption.slice(0, 1024)); form.set(kind, file);
  await telegramCall(kind === "photo" ? "sendPhoto" : kind === "video" ? "sendVideo" : "sendDocument", form);
}