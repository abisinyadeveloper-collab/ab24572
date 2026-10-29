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

  const voice = useLiveVoice({ token, language, onEvent: (e) => { lastEventAt.current = Date.now(); onEvent(e); } });
  const canStart = voice.status === "idle" || voice.status === "closed";
  const lastEventAt = useRef(0);
  const orbRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"listening" | "thinking" | "speaking">("listening");

  // Drive the orb from Ghost's real output volume and derive listening / thinking / speaking.
  useEffect(() => {
    if (voice.status !== "connected") return;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let raf = 0;
    const buf = new Uint8Array(256);
    const tick = () => {
      const stream = voice.audioRef.current?.srcObject;
      if (!analyser && stream instanceof MediaStream && stream.getAudioTracks().length) {
        try {
          ctx = new AudioContext();
          analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
        } catch { analyser = null; }
      }
      let level = 0;
      if (analyser) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      }
      orbRef.current?.style.setProperty("--level", level.toFixed(3));
      const recent = Date.now() - lastEventAt.current < 1200;
      const next = level > 0.04 || (recent && last.current === "assistant") ? "speaking" : recent && last.current === "user" ? "thinking" : "listening";
      setPhase((p) => (p === next ? p : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); void ctx?.close(); };
  }, [voice.status, voice.audioRef]);

  const state = voice.error ? "error" : voice.status === "connected" ? (voice.muted ? "muted" : phase) : voice.status;
  const label: Record<string, string> = { ...statusLabel, listening: "Listening…", thinking: "Thinking…", speaking: "Ghost is speaking", muted: "Microphone muted", error: "Something went wrong" };

  return (
    <div className="voice-call">
      <audio ref={voice.audioRef} autoPlay className="hidden" />
      <label className="voice-language">Conversation language<select aria-label="Conversation language" value={language} disabled={!canStart} onChange={e => setLanguage(e.target.value)}>{voiceLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <div ref={orbRef} className={`voice-presence state-${state}`} aria-hidden="true">
        <span className="ring" /><span className="ring r2" /><span className="core" />
      </div>
      <p role="status" className="voice-status">
        {label[state] ?? state}
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
            <Phone /> {!token ? "Sign in to call" : voice.error ? "Retry call" : "Start call"}
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
