import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { voiceLanguages } from "@/lib/ghost-media";

type Line = { role: "user" | "assistant"; text: string };

const statusLabel: Record<string, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  connected: "Live — listening",
  stopping: "Ending call…",
  closed: "Call ended",
};

function VoiceCall() {
  const [token, setToken] = useState("");
  const [language, setLanguage] = useState("am");
  const [lines, setLines] = useState<Line[]>([]);
  const last = useRef<"user" | "assistant" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ""));
    // Keep the sign-in token fresh so calls never start with an expired session.
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? ""));
    return () => data.subscription.unsubscribe();
  }, []);

  const onEvent = (event: LiveEvent) => {
    const e = event as LiveEvent & { delta?: string };
    const role =
      e.type === "session.input_transcript.delta" ? "user" : e.type === "session.output_transcript.delta" ? "assistant" : null;
    if (!role || typeof e.delta !== "string") return;
    const delta = e.delta;
    setLines((prev) => {
      if (last.current === role && prev.length) {
        const copy = [...prev];
        const tail = copy[copy.length - 1];
        if (!tail) return [...prev, { role, text: delta }];
        copy[copy.length - 1] = { ...tail, text: tail.text + delta };
        return copy;
      }
      return [...prev, { role, text: delta }];
    });
    last.current = role;
  };

  const voice = useLiveVoice({ token, language, onEvent });
  const canStart = voice.status === "idle" || voice.status === "closed";

  return (
    <div className="voice-call">
      <audio ref={voice.audioRef} autoPlay className="hidden" />
      <label className="voice-language">Conversation language<select aria-label="Conversation language" value={language} disabled={!canStart} onChange={e => setLanguage(e.target.value)}>{voiceLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <div className={`voice-orb ${voice.status === "connected" ? "live" : ""}`}>
        <Volume2 size={28} />
      </div>
      <p role="status" className="voice-status">
        {statusLabel[voice.status] ?? voice.status}
      </p>
      {voice.error && (
        <p role="alert" className="voice-error">
          {voice.error}
        </p>
      )}
      <div className="voice-controls">
        {canStart ? (
          <Button
            onClick={() => {
              setLines([]);
              last.current = null;
              voice.start();
            }}
            disabled={!token}
          >
            <Phone /> {token ? "Start call" : "Sign in to call"}
          </Button>
        ) : (
          <>
            <Button variant="outline" disabled={voice.status !== "connected"} onClick={() => voice.setMuted(!voice.muted)}>
              {voice.muted ? <MicOff /> : <Mic />} {voice.muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" disabled={voice.status === "stopping"} onClick={voice.stop}>
              <PhoneOff /> End call
            </Button>
          </>
        )}
        {voice.playbackBlocked && (
          <Button variant="outline" onClick={voice.resumePlayback}>
            Play voice
          </Button>
        )}
      </div>
      {lines.length > 0 && (
        <div className="voice-transcript">
          {lines.map((l, i) => (
            <p key={i} className={l.role === "user" ? "you" : "ghost"}>
              <span>{l.role === "user" ? "You" : "Ghost"}</span>
              {l.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function GhostVoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-panel max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Talk to Ghost</DialogTitle>
          <DialogDescription>Live conversation · የድምፅ ውይይት</DialogDescription>
        </DialogHeader>
        {open && <VoiceCall />}
      </DialogContent>
    </Dialog>
  );
}
