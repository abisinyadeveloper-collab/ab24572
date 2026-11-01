import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Memory = { id: string; fact: string };
type Activity = {
  id: string; source: string; tier: string; models: string[]; tools: string[];
  duration_ms: number; input_tokens: number | null; output_tokens: number | null; ok: boolean; created_at: string;
};

export function GhostMemories() {
  const [items, setItems] = useState<Memory[] | null>(null);
  useEffect(() => {
    void supabase.from("ghost_memories").select("id,fact").order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => setItems(data ?? []));
  }, []);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  async function add() {
    const fact = draft.trim().slice(0, 500);
    if (!fact) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setNote("Please sign in first.");
    const { data, error } = await supabase.from("ghost_memories").insert({ user_id: u.user.id, fact }).select("id,fact").single();
    if (error || !data) return setNote("Could not save that. Try again.");
    setItems((prev) => [data, ...(prev ?? [])]);
    setDraft(""); setNote("Saved. Ghost will use this in every chat and call.");
  }
  async function forget(id: string) {
    const { error } = await supabase.from("ghost_memories").delete().eq("id", id);
    if (!error) setItems((prev) => prev?.filter((m) => m.id !== id) ?? null);
  }
  return (
    <div className="memory-box">
      <strong>What Ghost remembers</strong>
      <p className="form-note">Say “Remember that…” in any chat, or add a fact here.</p>
      <div className="memory-add">
        <input aria-label="New memory" value={draft} maxLength={500} placeholder="e.g. I run ABISINIYA STORE" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} />
        <Button type="button" size="sm" onClick={() => void add()} disabled={!draft.trim()}>Remember</Button>
      </div>
      {note && <p className="form-note">{note}</p>}
      {items === null ? <p className="form-note">Loading…</p> : items.length === 0 ? <p className="form-note">Nothing saved yet.</p> : (
        <ul>
          {items.map((m) => (
            <li key={m.id}>
              <span>{m.fact}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Forget: ${m.fact}`} onClick={() => void forget(m.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GhostActivity() {
  const [rows, setRows] = useState<Activity[] | null>(null);
  useEffect(() => {
    void supabase.from("ghost_activity").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setRows((data as Activity[] | null) ?? []));
  }, []);
  if (rows === null) return <p className="form-note">Loading…</p>;
  if (!rows.length) return <p className="form-note">No activity yet. Send a message or make a call.</p>;
  return (
    <div className="activity-list">
      {rows.map((r) => (
        <div key={r.id} className="activity-row">
          <div><strong>{r.source === "voice" ? "Voice" : "Chat"} · {r.tier}</strong><span className={r.ok ? "text-signal" : "voice-error"}>{r.ok ? "Done" : "Failed"}</span></div>
          <p>{new Date(r.created_at).toLocaleString()} · {(r.duration_ms / 1000).toFixed(1)}s{r.input_tokens != null ? ` · ${r.input_tokens} in / ${r.output_tokens ?? 0} out tokens` : ""}</p>
          <p>{r.models.length ? `Ghost · ${r.models.length} step${r.models.length > 1 ? "s" : ""}` : "—"}{r.tools.length ? ` · tools: ${r.tools.join(", ")}` : ""}</p>
        </div>
      ))}
    </div>
  );
}
