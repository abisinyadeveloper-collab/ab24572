import { useEffect, useState } from "react";
import ghostMark from "@/assets/ghost-emblem.jpg";

/** One launch per document; internal navigation never restarts the splash. */
export function GhostSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 1550;
    const timer = window.setTimeout(() => setVisible(false), delay);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="ghost-splash" role="status" aria-label="Opening Ghost">
      <div className="ghost-splash-brand">
        <img className="ghost-splash-logo" src={ghostMark} alt="" width={112} height={112} />
        <h1 className="ghost-splash-name">Ghost</h1>
        <span className="ghost-splash-signature">ABISINYA</span>
        <div className="ghost-splash-progress" aria-hidden="true" />
      </div>
    </div>
  );
}