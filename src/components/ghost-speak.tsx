import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Reads one Ghost answer aloud; the audio is fetched once and replayed from memory.
export function SpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string>("");
  useEffect(() => () => { audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);

  async function toggle() {
    if (state === "playing") { audio.current?.pause(); setState("idle"); return; }
    if (state === "loading" || !text.trim()) return;
    try {
      if (!url.current) {
        setState("loading");
        const { data } = await supabase.auth.getSession();
        const res = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ text: text.slice(0, 5000) }) });
        if (!res.ok) { const body = await res.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? "Ghost voice is unavailable."); }
        url.current = URL.createObjectURL(await res.blob());
      }
      const a = audio.current ?? new Audio();
      audio.current = a; a.src = url.current; a.onended = () => setState("idle");
      await a.play(); setState("playing");
    } catch (error) { setState("idle"); toast.error(error instanceof Error ? error.message : "Ghost voice is unavailable."); }
  }
  return (
    <Button size="icon-sm" variant="ghost" title={state === "playing" ? "Stop" : "Listen"} aria-label={state === "playing" ? "Stop reading" : "Read answer aloud"} onClick={() => void toggle()}>
      {state === "loading" ? <Loader2 className="animate-spin" /> : state === "playing" ? <Square /> : <Volume2 />}
    </Button>
  );
}
