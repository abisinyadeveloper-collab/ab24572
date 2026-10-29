// Allow-list entries are comma/space separated Telegram IDs or phone numbers (e.g. "123456789, +251911234567").
export function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

export function isAllowedTelegramUser(list: string, telegramId: number, phone?: string | null) {
  const entries = list.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const id = String(telegramId);
  const digits = phone ? normalizePhone(phone) : "";
  return entries.some((e) => {
    if (e.startsWith("+") || e.replace(/\D/g, "").length >= 9 && e.replace(/\D/g, "") !== e) {
      const d = normalizePhone(e);
      return !!digits && d.length >= 7 && (digits === d || digits.endsWith(d.replace(/^0+/, "")));
    }
    if (e === id) return true;
    const d = normalizePhone(e);
    return !!digits && d.length >= 7 && (digits === d || digits.endsWith(d.replace(/^0+/, "")));
  });
}
