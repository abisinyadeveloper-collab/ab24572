import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { friendlyAuthError, passwordIssue, passwordStrength, MIN_PASSWORD, readAuthLink } from "@/lib/auth-rules";
import emblem from "@/assets/ghost-emblem.jpg";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Reset password — ABISINYA GHOST" },
      { name: "description", content: "Securely reset your Ghost account password." },
      { property: "og:title", content: "Reset password — ABISINYA GHOST" },
      { property: "og:description", content: "Recover access to your Ghost workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

const STRENGTH = ["Too short", "Weak", "Okay", "Strong", "Very strong"];

function Reset() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const link = readAuthLink(window.location.hash, window.location.search);
    if (link.error) { setLinkError(link.error); setState("invalid"); return; }
    const isRecovery = link.type === "recovery" || link.hasToken;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) setState("ready");
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setState("ready");
      else if (!isRecovery) { setLinkError("Open the password reset link from your email to continue."); setState("invalid"); }
    });
    const giveUp = setTimeout(() => setState((c) => {
      if (c === "checking") setLinkError("This reset link has expired or was already used. Request a new one.");
      return c === "checking" ? "invalid" : c;
    }), 10000);
    return () => { data.subscription.unsubscribe(); clearTimeout(giveUp); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const issue = passwordIssue(password, confirm);
    if (issue) return setError(issue);
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err.message).text);
    setState("done");
    setTimeout(() => window.location.replace("/"), 2000);
  }

  const strength = passwordStrength(password);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-glow" aria-hidden="true" />
        <div className="grid justify-items-center gap-2 text-center">
          <img src={emblem} alt="Ghost" className="auth-emblem" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {state === "done" ? "Password updated" : state === "invalid" ? "Link not valid" : "Choose a new password"}
          </h1>
        </div>

        {state === "checking" && <Loader2 className="mx-auto size-6 animate-spin text-primary" />}

        {state === "invalid" && (
          <div className="grid gap-3 text-center">
            <TriangleAlert className="mx-auto size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{linkError}</p>
            <Link to="/login" search={{ next: "/" }} className="auth-submit-link">Request a new link</Link>
          </div>
        )}

        {state === "done" && (
          <div className="grid gap-3 text-center">
            <CheckCircle2 className="mx-auto size-8 text-primary" />
            <p className="text-sm text-muted-foreground">You're signed in with your new password. Taking you to Ghost…</p>
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={submit} className="grid gap-3">
            <label className="auth-input">
              <Lock className="size-4" aria-hidden="true" />
              <span className="sr-only">New password</span>
              <input type={show ? "text" : "password"} placeholder={`New password (${MIN_PASSWORD}+ characters)`} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </label>
            {password && (
              <div className="auth-strength" data-score={strength}>
                <div className="auth-strength-bar"><span style={{ width: `${(strength / 4) * 100}%` }} /></div>
                <span>{STRENGTH[strength]}</span>
              </div>
            )}
            <label className="auth-input">
              <Lock className="size-4" aria-hidden="true" />
              <span className="sr-only">Confirm new password</span>
              <input type={show ? "text" : "password"} placeholder="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </label>
            <Button className="auth-submit h-12 rounded-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Update password
            </Button>
            {error && <p role="status" className="auth-notice error">{error}</p>}
          </form>
        )}
        <p className="auth-fine">Ghost · ABISINYA</p>
      </section>
    </main>
  );
}
