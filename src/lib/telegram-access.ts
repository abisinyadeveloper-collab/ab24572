// Only Telegram-authenticated private messages identify a user. Never trust a
// contact card, typed ID, username, or a group chat as the caller's identity.
export function telegramUserId(message: {
  chat?: { id?: number; type?: string };
  from?: { id?: number; is_bot?: boolean };
}): number | null {
  const id = message.from?.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  if (message.from?.is_bot || message.chat?.type !== "private" || message.chat.id !== id) return null;
  return id;
}
