import { useEffect, useState } from "react";
import { Camera, Mic, MapPin, Bell, MonitorUp, Clipboard, Vibrate, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { queryPermission, useDevicePrefs, type PermState } from "@/lib/device-permissions";

type Row = { id: string; label: string; note: string; icon: typeof Camera };
const rows: Row[] = [
  { id: "camera", label: "Camera", note: "Take a photo and ask Ghost about it", icon: Camera },
  { id: "microphone", label: "Microphone", note: "Live voice calls", icon: Mic },
  { id: "geolocation", label: "Location", note: "Nearby and local answers", icon: MapPin },
  { id: "notifications", label: "Notifications", note: "Alert when a video is ready", icon: Bell },
];

const word: Record<PermState, string> = { granted: "Allowed", denied: "Blocked", prompt: "Not asked yet", unsupported: "Ask when used" };

export function GhostPermissions() {
  const [states, setStates] = useState<Record<string, PermState>>({});
  const [prefs, update] = useDevicePrefs();
  const [note, setNote] = useState("");
  const [support, setSupport] = useState({ screen: false, share: false, vibrate: false });

  const refresh = async () => {
    const entries = await Promise.all(rows.map(async (r) => [r.id, await queryPermission(r.id)] as const));
    const s = Object.fromEntries(entries);
    if (typeof Notification !== "undefined") s["notifications"] = Notification.permission === "default" ? "prompt" : Notification.permission;
    setStates(s);
  };
  useEffect(() => {
    void refresh();
    setSupport({ screen: !!navigator.mediaDevices?.getDisplayMedia, share: "share" in navigator, vibrate: "vibrate" in navigator });
  }, []);

  async function allow(id: string) {
    setNote("");
    try {
      if (id === "camera" || id === "microphone") {
        const s = await navigator.mediaDevices.getUserMedia(id === "camera" ? { video: true } : { audio: true });
        s.getTracks().forEach((t) => t.stop());
      } else if (id === "geolocation") {
        await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { timeout: 10000 }));
        update({ shareLocation: true });
      } else if (id === "notifications") {
        if (typeof Notification === "undefined") throw new Error("Notifications aren't supported here.");
        const r = await Notification.requestPermission();
        if (r === "granted") update({ notify: true });
      }
    } catch {
      setNote("Permission was not given. You can change it in your browser's site settings.");
    }
    void refresh();
  }

  return (
    <div className="memory-box permissions-box">
      <strong>Device permissions</strong>
      <p className="form-note">Ghost only uses these when you tap a button. You can block them anytime in your browser's site settings.</p>
      <ul>
        {rows.map(({ id, label, note: n, icon: Icon }) => {
          const st = states[id] ?? "unsupported";
          return (
            <li key={id} className="perm-row">
              <Icon size={18} />
              <span className="perm-text"><b>{label}</b><small>{n} · {word[st]}</small></span>
              {st === "granted" ? (
                id === "geolocation" ? <Switch aria-label="Share location with Ghost" checked={prefs.shareLocation} onCheckedChange={(v) => update({ shareLocation: v })} />
                : id === "notifications" ? <Switch aria-label="Video ready alerts" checked={prefs.notify} onCheckedChange={(v) => update({ notify: v })} />
                : <span className="perm-ok">On</span>
              ) : (
                <Button size="sm" variant="outline" disabled={st === "denied"} onClick={() => void allow(id)}>{st === "denied" ? "Blocked" : "Allow"}</Button>
              )}
            </li>
          );
        })}
        <li className="perm-row"><MonitorUp size={18} /><span className="perm-text"><b>Screen share</b><small>Show Ghost your screen · {support.screen ? "Asks each time" : "Not on this device"}</small></span></li>
        <li className="perm-row"><Share2 size={18} /><span className="perm-text"><b>Share to apps</b><small>Send replies to other apps · {support.share ? "Available" : "Not on this device"}</small></span></li>
        <li className="perm-row"><Clipboard size={18} /><span className="perm-text"><b>Clipboard</b><small>Copy replies · Available</small></span></li>
        <li className="perm-row"><Vibrate size={18} /><span className="perm-text"><b>Vibration</b><small>Gentle feedback on send · {support.vibrate ? "Available" : "Not on this device"}</small></span>
          {support.vibrate && <Switch aria-label="Vibration" checked={prefs.haptics} onCheckedChange={(v) => update({ haptics: v })} />}</li>
      </ul>
      {note && <p role="alert" className="form-note">{note}</p>}
    </div>
  );
}
