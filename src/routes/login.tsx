import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GhostAuth } from "@/components/ghost-auth";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in — Ghost" },
      { name: "description", content: "Sign in to your Ghost account to continue." },
      { property: "og:title", content: "Sign in — Ghost" },
      { property: "og:description", content: "Sign in to your Ghost account to continue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    const go = () => { window.location.href = next; };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) go(); });
    return () => data.subscription.unsubscribe();
  }, [next]);
  return <main className="min-h-screen"><GhostAuth open next={next} onOpenChange={(v) => { if (!v) navigate({ to: "/" }); }} /></main>;
}
