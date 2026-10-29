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
  async function forget(id: string) {
    const { error } = await supabase.from("ghost_memories").delete().eq("id", id);
    if (!error) setItems((prev) => prev?.filter((m) => m.id !== id) ?? null);
  }
  return (
    <div className="memory-box">
      <strong>What Ghost remembers</strong>
      <p className="form-note">Say “Remember that…” or tell Ghost about yourself in any chat.</p>
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
          <p>{r.models.map((m) => m.split("/")[1]).join(" → ") || "—"}{r.tools.length ? ` · tools: ${r.tools.join(", ")}` : ""}</p>
        </div>
      ))}
    </div>
  );
}
