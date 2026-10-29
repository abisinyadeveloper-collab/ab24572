// Browser-only local copies so Ghost opens offline with past chats and queued messages.
type ThreadRow = { id: string; title: string; updated_at: string };
export type QueuedMessage = { id: string; text: string };

const get = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const set = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full: offline copy is best-effort */
  }
};

export const cacheThreads = (userId: string, rows: ThreadRow[]) => set(`ghost-off-threads-${userId}`, rows);
export const cachedThreads = (userId: string) => get<ThreadRow[]>(`ghost-off-threads-${userId}`, []);
export const cacheMessages = (threadId: string, messages: unknown[]) => set(`ghost-off-msgs-${threadId}`, messages);
export const cachedMessages = (threadId: string) => get<unknown[] | null>(`ghost-off-msgs-${threadId}`, null);

export const queuedMessages = (threadId: string) => get<QueuedMessage[]>(`ghost-off-queue-${threadId}`, []);
export function queueMessage(threadId: string, text: string) {
  const next = [...queuedMessages(threadId), { id: crypto.randomUUID(), text }];
  set(`ghost-off-queue-${threadId}`, next);
  return next;
}
export function shiftQueue(threadId: string) {
  const [first, ...rest] = queuedMessages(threadId);
  set(`ghost-off-queue-${threadId}`, rest);
  return first;
}
export const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;
