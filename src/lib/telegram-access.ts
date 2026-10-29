// Allow-list entries are comma/space separated Telegram IDs or phone numbers (e.g. "123456789, +251911234567").
export function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

export function isAllowedTelegramUser(list: string, telegramId: number, phone?: string | null) {
  const entries = list.split(/[\s,;]+/).filter(Boolean);
  const digits = phone ? normalizePhone(phone) : "";
  return entries.some((e) => {
    if (e === String(telegramId)) return true;
    const d = normalizePhone(e).replace(/^0+/, "");
    return !!digits && d.length >= 7 && digits.endsWith(d);
  });
}
