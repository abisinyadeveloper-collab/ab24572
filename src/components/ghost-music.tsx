import { useEffect, useState } from "react";
import { Music, Loader2, Download, Trash2, Mic, Piano } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MUSIC_PRESETS } from "@/lib/ghost-audio";

type Track = { id: string; prompt: string; path: string | null; src?: string | undefined };

export function GhostMusic({ userId, onSignIn }: { userId?: string | undefined; onSignIn: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [vocals, setVocals] = useState(false);
  const [length, setLength] = useState<"clip" | "full">("clip");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);

  async function refresh() {
    if (!userId) { setTracks([]); return; }
    const { data, error } = await supabase.from("ghost_media").select("id,prompt,path").eq("kind", "music").order("created_at", { ascending: false }).limit(50);
    if (error) { setNote(error.message); return; }
    setTracks(await Promise.all((data ?? []).map(async t => ({ ...t, src: t.path ? (await supabase.storage.from("ghost-media").createSignedUrl(t.path, 3600)).data?.signedUrl : undefined }))));
  }
  useEffect(() => { void refresh(); }, [userId]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { onSignIn(); return; }
    if (busy || !prompt.trim()) return;
    setBusy(true); setNote(length === "full" ? "Composing your full song… this can take a minute or two." : "Composing your 30-second clip…");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/music", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ prompt, vocals, lyrics: vocals ? lyrics : "", length }) });
      const body = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) throw new Error(body.message ?? "Ghost could not create this track.");
      setNote("Saved to your music library."); await refresh();
    } catch (error) { setNote(error instanceof Error ? error.message : "Ghost could not create this track."); }
    finally { setBusy(false); }
  }
  async function remove(t: Track) {
    if (t.path) await supabase.storage.from("ghost-media").remove([t.path]);
    await supabase.from("ghost_media").delete().eq("id", t.id);
    await refresh();
  }

  return (
    <div className="studio">
      <form className="studio-form" onSubmit={generate}>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Music />Music studio</h1>
        <div className="flex flex-wrap gap-2">
          {MUSIC_PRESETS.map(p => <Button key={p.label} type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setPrompt(p.prompt)}>{p.label}</Button>)}
        </div>
        <textarea className="w-full rounded-2xl border bg-background p-3" rows={3} placeholder="Describe your song: genre, mood, instruments, tempo…" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={3000} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={!vocals ? "default" : "outline"} className="rounded-full" onClick={() => setVocals(false)}><Piano />Instrumental</Button>
          <Button type="button" size="sm" variant={vocals ? "default" : "outline"} className="rounded-full" onClick={() => setVocals(true)}><Mic />With vocals</Button>
          <Button type="button" size="sm" variant={length === "clip" ? "default" : "outline"} className="rounded-full" onClick={() => setLength("clip")}>30s clip</Button>
          <Button type="button" size="sm" variant={length === "full" ? "default" : "outline"} className="rounded-full" onClick={() => setLength("full")}>Full song (~3 min)</Button>
        </div>
        {vocals && <textarea className="w-full rounded-2xl border bg-background p-3" rows={4} placeholder="Optional lyrics (Amharic, Afaan Oromoo, English…). Leave empty and Ghost writes them." value={lyrics} onChange={e => setLyrics(e.target.value)} maxLength={3000} />}
        <Button type="submit" className="rounded-full" disabled={busy || !prompt.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Music />}{busy ? "Composing…" : "Generate"}</Button>
        {note && <p className="text-sm text-muted-foreground" role="status">{note}</p>}
      </form>
      <section className="mt-6 grid gap-3">
        {tracks.length === 0 && userId && <p className="text-sm text-muted-foreground">Your tracks will appear here.</p>}
        {tracks.map(t => (
          <div key={t.id} className="rounded-2xl border bg-card p-3">
            <p className="mb-2 line-clamp-2 text-sm">{t.prompt}</p>
            {t.src && <audio controls preload="none" src={t.src} className="w-full" />}
            <div className="mt-2 flex gap-2">
              {t.src && <Button asChild size="sm" variant="ghost"><a href={t.src} download="ghost-track.mp3"><Download />Download</a></Button>}
              <Button size="sm" variant="ghost" onClick={() => void remove(t)}><Trash2 />Delete</Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
