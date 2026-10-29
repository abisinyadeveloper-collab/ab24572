import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Film, Download, Upload, WandSparkles, Loader2, Pencil, Image, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { streamImage } from "@/lib/stream-image";
import { generateGhostVideo, pollGhostVideo } from "@/lib/ghost-media.functions";

type Media = { id: string; kind: string; prompt: string; path: string | null; status: string; error: string | null; src?: string | undefined };
export function GhostStudio({ userId, onSignIn, initialMode = "image" }: { userId?: string | undefined; onSignIn: () => void; initialMode?: "image" | "video" }) {
  const [mode, setMode] = useState<"image" | "edit" | "video">(initialMode);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("high");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [duration, setDuration] = useState<"3s" | "5s" | "8s" | "10s">("5s");
  const [ratio, setRatio] = useState<"16:9" | "9:16">("16:9");
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [preview, setPreview] = useState("");
  const [final, setFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const createVideo = useServerFn(generateGhostVideo), pollVideo = useServerFn(pollGhostVideo);

  async function refresh() {
    if (!userId) { setItems([]); return; }
    const { data, error } = await supabase.from("ghost_media").select("id,kind,prompt,path,status,error").order("created_at", { ascending: false }).limit(50);
    if (error) { setNote(error.message); return; }
    const rows = await Promise.all((data ?? []).map(async item => ({ ...item, src: item.path ? (await supabase.storage.from("ghost-media").createSignedUrl(item.path, 3600)).data?.signedUrl : undefined })));
    setItems(rows);
    const pending = rows.find(i => i.kind === "video" && ["queued", "in_progress"].includes(i.status));
    if (pending) setActiveJob(pending.id);
  }
  useEffect(() => { void refresh(); }, [userId]);
  useEffect(() => { if (!file) { setReference(""); return; } const src = URL.createObjectURL(file); setReference(src); return () => URL.revokeObjectURL(src); }, [file]);
  useEffect(() => {
    if (!activeJob || !userId) return;
    let live = true; let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const row = await pollVideo({ data: { id: activeJob ?? "" } });
        if (!live) return;
        if (["completed", "failed"].includes(row.status)) {
          setActiveJob(null); setBusy(false); setNote(row.error ?? "Video saved to your library."); await refresh();
        } else { setNote("Your video is generating…"); timer = setTimeout(check, 8000); }
      } catch (error) { if (live) { setBusy(false); setNote(error instanceof Error ? error.message : "Could not check video progress."); } }
    }
    timer = setTimeout(check, 8000);
    return () => { live = false; clearTimeout(timer); };
  }, [activeJob, userId]);

  async function saveImage(src: string) {
    if (!userId) return;
    const blob = await (await fetch(src)).blob();
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from("ghost-media").upload(path, blob, { contentType: "image/png" });
    if (uploadError) throw new Error("Image created, but saving failed. Download it to keep a copy.");
    const { error } = await supabase.from("ghost_media").insert({ user_id: userId, kind: "image", prompt, path });
    if (error) throw new Error("Image created, but adding it to your library failed. Download it to keep a copy.");
    await refresh(); setNote("Saved to your library.");
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { onSignIn(); return; }
    if (busy || !prompt.trim()) return;
    setBusy(true); setNote(""); setPreview(""); setFinal(false);
    try {
      if (mode === "video") {
        const job = await createVideo({ data: { prompt, resolution, duration, aspectRatio: ratio } });
        setActiveJob(job.id); setNote("Your video is generating…"); await refresh(); return;
      }
      const { data } = await supabase.auth.getSession();
      let input: Record<string, unknown> | FormData = { prompt, size, quality };
      if (mode === "edit") {
        if (!file) throw new Error("Upload an image to edit.");
        input = new FormData(); input.set("prompt", prompt); input.set("image", file); input.set("size", size); input.set("quality", quality);
      }
      let completed = "";
      await streamImage("/api/images", input, (src, isFinal) => { setPreview(src); setFinal(isFinal); if (isFinal) completed = src; }, undefined, { Authorization: `Bearer ${data.session?.access_token ?? ""}` });
      if (completed) await saveImage(completed);
    } catch (error) { setNote(error instanceof Error ? error.message : "Creation failed."); setFinal(false); }
    finally { setBusy(false); }
  }
  async function download(src: string, kind: string) {
    const blob = await (await fetch(src)).blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ghost-${Date.now()}.${kind === "video" ? "mp4" : "png"}`; a.click(); URL.revokeObjectURL(url);
  }
  async function editSaved(item: Media) {
    if (!item.src) return;
    const blob = await (await fetch(item.src)).blob(); setFile(new File([blob], "ghost-reference.png", { type: "image/png" })); setMode("edit"); setPrompt("");
  }
  async function remove(item: Media) {
    if (item.path) { const { error } = await supabase.storage.from("ghost-media").remove([item.path]); if (error) { setNote(error.message); return; } }
    const { error } = await supabase.from("ghost_media").delete().eq("id", item.id);
    if (error) setNote(error.message); else await refresh();
  }
  return <div className="studio-page">
    <div className="studio-heading"><div><p className="eyebrow">GHOST STUDIO</p><h1>Create something extraordinary.</h1></div><span className="studio-count">{items.filter(i => i.status === "completed").length} creations</span></div>
    <div className="studio-tabs" role="tablist" aria-label="Creative mode">
      {([{ id: "image", label: "Create image", icon: ImagePlus }, { id: "edit", label: "Edit image", icon: Pencil }, { id: "video", label: "Create video", icon: Film }] as const).map(t => <Button key={t.id} role="tab" aria-selected={mode === t.id} variant={mode === t.id ? "secondary" : "ghost"} disabled={busy} onClick={() => { setMode(t.id); setNote(""); }}><t.icon size={16}/>{t.label}</Button>)}
    </div>
    <form onSubmit={generate} className="studio-form">
      {mode === "edit" && <div className="studio-reference">{reference && <img src={reference} alt="Image to edit"/>}<Button type="button" variant="outline" onClick={() => upload.current?.click()} disabled={busy}><Upload/>{file ? "Replace image" : "Upload image"}</Button><input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Image to edit" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}/></div>}
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={10000} aria-label="Creative prompt" placeholder={mode === "edit" ? "What would you like to change?" : mode === "video" ? "Describe your scene, movement, camera, and sound…" : "Describe the image you’re imagining…"} disabled={busy}/>
      <div className="studio-options">
        {mode === "video" ? <><label>Resolution<select value={resolution} onChange={e => setResolution(e.target.value as typeof resolution)} disabled={busy}><option>720p</option><option>1080p</option><option>4k</option></select></label><label>Length<select value={duration} onChange={e => setDuration(e.target.value as typeof duration)} disabled={busy}>{["3s","5s","8s","10s"].map(v => <option key={v}>{v}</option>)}</select></label><label>Format<select value={ratio} onChange={e => setRatio(e.target.value as typeof ratio)} disabled={busy}><option value="16:9">Landscape</option><option value="9:16">Portrait</option></select></label></> : <><label>Format<select value={size} onChange={e => setSize(e.target.value)} disabled={busy}><option value="1024x1024">Square</option><option value="1536x1024">Landscape</option><option value="1024x1536">Portrait</option></select></label><label>Quality<select value={quality} onChange={e => setQuality(e.target.value)} disabled={busy}><option value="high">High</option><option value="max">Maximum</option><option value="medium">Standard</option></select></label></>}
        <Button type="submit" className="studio-generate" disabled={busy || (mode === "video" && Boolean(activeJob)) || !prompt.trim() || (mode === "edit" && !file)}>{busy ? <Loader2 className="animate-spin"/> : <WandSparkles/>}{busy ? "Creating…" : mode === "video" ? "Generate video" : mode === "edit" ? "Apply edit" : "Generate image"}</Button>
      </div>
    </form>
    <p className="studio-credit">Creations use AI credits. Videos include generated sound.</p>
    {note && <p role="status" className="studio-note">{note}</p>}
    {preview && <div className="studio-result"><img src={preview} alt="Your Ghost creation" className={final ? "final" : "partial"}/>{final && <Button variant="outline" onClick={() => void download(preview, "image")}><Download/>Download</Button>}</div>}
    <div className="studio-library-heading"><h2>Your library</h2>{activeJob && <Button variant="ghost" onClick={() => { setActiveJob(null); requestAnimationFrame(() => setActiveJob(activeJob)); }}>Check video progress</Button>}</div>
    {!items.length ? <div className="studio-empty"><Image size={28}/><p>{userId ? "Your creations will appear here." : "Sign in to create and save images and videos."}</p>{!userId && <Button variant="outline" onClick={onSignIn}>Sign in</Button>}</div> : <div className="studio-library">{items.map(item => <article key={item.id} className="creation-item">
      <div className="creation-media">{item.src ? item.kind === "video" ? <video src={item.src} controls preload="metadata"/> : <img src={item.src} alt={item.prompt}/> : <div className="creation-pending">{item.status === "failed" ? <Film/> : <Loader2 className="animate-spin"/>}<span>{item.error || "Generating video…"}</span></div>}</div>
      <div className="creation-footer"><p title={item.prompt}>{item.prompt}</p><div>{item.src && <><Button size="icon-sm" variant="ghost" title="Download" aria-label="Download creation" onClick={() => void download(item.src ?? "", item.kind)}><Download/></Button>{item.kind === "image" && <Button size="icon-sm" variant="ghost" title="Edit image" aria-label="Edit creation" onClick={() => void editSaved(item)}><Pencil/></Button>}</>}<Button size="icon-sm" variant="ghost" title="Delete" aria-label="Delete creation" disabled={["queued","in_progress"].includes(item.status)} onClick={() => void remove(item)}><Trash2/></Button></div></div>
    </article>)}</div>}
  </div>;
}