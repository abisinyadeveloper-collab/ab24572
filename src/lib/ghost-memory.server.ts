import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { extractMemoryFacts } from "./ghost";
import { memoriesToForget, memoryTopic, normalizeMemory, parseForgetRequest, type SavedMemory } from "./ghost-memory";

export async function loadUserMemories(db: SupabaseClient<Database>, userId: string): Promise<SavedMemory[]> {
  const { data, error } = await db.from("ghost_memories").select("id,fact").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Ghost could not load your saved memories. Please try again.");
  return data ?? [];
}

export async function applyMemoryRequest(db: SupabaseClient<Database>, userId: string, text: string) {
  let rows = await loadUserMemories(db, userId);
  const target = parseForgetRequest(text);
  if (target !== null) {
    const removed = memoriesToForget(target, rows);
    if (removed.length) {
      const { error } = await db.from("ghost_memories").delete().eq("user_id", userId).in("id", removed.map(row => row.id));
      if (error) throw new Error("Ghost could not forget that memory. Please try again.");
      rows = rows.filter(row => !removed.some(item => item.id === row.id));
    }
    return { rows, saved: 0, removed: removed.length, forgetRequested: true };
  }
  let saved = 0;
  for (const fact of extractMemoryFacts(text)) {
    if (rows.some(row => normalizeMemory(row.fact) === normalizeMemory(fact))) continue;
    const topic = memoryTopic(fact);
    const replaced = topic ? rows.filter(row => memoryTopic(row.fact) === topic) : [];
    // Save the correction before deleting the old fact, so failed inserts never lose memory.
    const { data, error } = await db.from("ghost_memories").insert({ user_id: userId, fact }).select("id,fact").single();
    if (error || !data) throw new Error("Ghost could not save your memory. Please try again.");
    if (replaced.length) {
      const { error } = await db.from("ghost_memories").delete().eq("user_id", userId).in("id", replaced.map(row => row.id));
      if (error) throw new Error("Your new memory was saved, but the older version could not be removed.");
    }
    rows = [data, ...rows.filter(row => !replaced.some(item => item.id === row.id))];
    saved++;
  }
  return { rows, saved, removed: 0, forgetRequested: false };
}