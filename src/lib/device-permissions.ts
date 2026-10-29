import { useEffect, useState } from "react";

export type DevicePrefs = { shareLocation: boolean; notify: boolean; haptics: boolean };
const KEY = "ghost-device-prefs";
const defaults: DevicePrefs = { shareLocation: false, notify: false, haptics: true };

export function readPrefs(): DevicePrefs {
  if (typeof window === "undefined") return defaults;
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return defaults; }
}

export function useDevicePrefs() {
  const [prefs, setPrefs] = useState<DevicePrefs>(defaults);
  useEffect(() => {
    setPrefs(readPrefs());
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("ghost-prefs", sync);
    return () => window.removeEventListener("ghost-prefs", sync);
  }, []);
  const update = (patch: Partial<DevicePrefs>) => {
    const next = { ...readPrefs(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ghost-prefs"));
  };
  return [prefs, update] as const;
}

export type PermState = "granted" | "denied" | "prompt" | "unsupported";

export async function queryPermission(name: string): Promise<PermState> {
  try {
    const r = await navigator.permissions.query({ name: name as PermissionName });
    return r.state;
  } catch {
    return "unsupported";
  }
}

export function haptic(pattern: number | number[] = 12) {
  if (readPrefs().haptics && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

export function notify(title: string, body: string) {
  if (!readPrefs().notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  new Notification(title, { body, icon: "/favicon.png" });
}

export function currentLocation(): Promise<{ lat: number; lon: number } | null> {
  if (!readPrefs().shareLocation || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 1000) / 1000, lon: Math.round(p.coords.longitude * 1000) / 1000 }),
      () => resolve(null),
      { maximumAge: 300000, timeout: 5000 },
    ),
  );
}

function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the image."));
    r.readAsDataURL(blob);
  });
}

/** Downscale an image to a JPEG data URL so it stays small enough to send. */
export async function compressImage(source: Blob | HTMLCanvasElement, max = 1280): Promise<string> {
  let canvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) canvas = source;
  else {
    const img = await createImageBitmap(source);
    canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
  }
  const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale); out.height = Math.round(canvas.height * scale);
  out.getContext("2d")!.drawImage(canvas, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not process the image.");
  return fileToDataUrl(blob);
}

/** Ask to share a screen or window, grab one frame, then stop sharing. */
export async function captureScreen(): Promise<string> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing isn't supported on this device.");
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream; video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 300));
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0);
    return compressImage(c);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export function runPhoneAction(a: import("./ghost").PhoneAction) {
  if (a.kind === "open") window.open(a.url, "_blank", "noopener");
  else window.location.href = `${a.kind === "call" ? "tel" : "sms"}:${a.number}`;
}
