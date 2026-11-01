import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readAuthLink } from "@/lib/auth-rules";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import emblem from "@/assets/ghost-emblem.jpg";

export const Route = createFileRoute("/auth/callback")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s["next"]) }),
  head: () => ({
    meta: [
      { title: "Confirming your email — Ghost" },
      { name: "description", content: "Confirming your Ghost account email address." },
      { property: "og:title", content: "Confirming your email — Ghost" },
      { property: "og:description", content: "Confirming your Ghost account email address." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const { next } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");

  useEffect(() => {
    const link = readAuthLink(window.location.hash, window.location.search);
    if (link.error) { setError(link.error); setState("error"); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      setState("done");
      timer = setTimeout(() => { window.location.replace(next); }, 1600);
    };
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (session) finish(); });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) finish();
      else if (!link.hasToken) { setError("This confirmation link is incomplete. Request a new one from the sign-in screen."); setState("error"); }
    });
    const giveUp = setTimeout(() => setState((c) => {
      if (c === "working") setError("We couldn't confirm this link. It may have expired — request a new one.");
      return c === "working" ? "error" : c;
    }), 10000);
    return () => { data.subscription.unsubscribe(); clearTimeout(giveUp); if (timer) clearTimeout(timer); };
  }, [next]);

  return (
    <main className="auth-page">
      <section className="auth-card text-center">
        <div className="auth-glow" aria-hidden="true" />
        <img src={emblem} alt="Ghost" className="auth-emblem mx-auto" />
        {state === "working" && (<><Loader2 className="mx-auto size-6 animate-spin text-primary" /><h1 className="text-xl font-semibold">Confirming your email…</h1></>)}
        {state === "done" && (<><CheckCircle2 className="mx-auto size-8 text-primary" /><h1 className="text-xl font-semibold">Email confirmed</h1><p className="text-sm text-muted-foreground">Welcome to Ghost. Taking you in…</p></>)}
        {state === "error" && (
          <>
            <TriangleAlert className="mx-auto size-8 text-destructive" />
            <h1 className="text-xl font-semibold">Link not valid</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/login" search={{ next }} className="auth-submit-link">Back to sign in</Link>
          </>
        )}
        <p className="auth-fine">Ghost · ABISINYA</p>
      </section>
    </main>
  );
}
