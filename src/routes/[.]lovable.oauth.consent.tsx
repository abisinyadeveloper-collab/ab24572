import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string; redirect_uri?: string }; scope?: string; user?: { email?: string } } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Connect an app — Ghost" },
      { name: "description", content: "Approve or deny an app's access to your Ghost account." },
      { property: "og:title", content: "Connect an app — Ghost" },
      { property: "og:description", content: "Approve or deny an app's access to your Ghost account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing or invalid.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    const { data: u } = await supabase.auth.getUser();
    return { ...data, email: u.user?.email };
  },
  component: Consent,
  pendingComponent: () => <main className="grid min-h-screen place-items-center text-muted-foreground">Loading…</main>,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <p>Could not load this connection request: {error instanceof Error ? error.message : String(error)}</p>
    </main>
  ),
});

function Consent() {
  const d = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = d?.client?.name ?? "An app";
  const scopes = (d?.scope ?? "").split(" ").filter(Boolean);
  const label = (s: string) => s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : s === "openid" ? "Confirm your identity" : `Additional permission requested: ${s}`;

  async function decide(approve: boolean) {
    setBusy(true); setError(null);
    const { data, error } = approve ? await oauth().approveAuthorization(authorization_id) : await oauth().denyAuthorization(authorization_id);
    const target = data?.redirect_url ?? data?.redirect_to;
    if (error || !target) { setBusy(false); setError(error?.message ?? "No redirect returned."); return; }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Connect {name} to Ghost</h1>
        {d?.email && <p className="text-sm text-muted-foreground">Signed in as {d.email}</p>}
        {d?.client?.redirect_uri && <p className="break-all text-xs text-muted-foreground">Returns to {d.client.redirect_uri}</p>}
        <p>{name} will be able to read your chats and memories and add memories while you are signed in.</p>
        {scopes.length > 0 && <ul className="list-disc pl-5 text-sm">{scopes.map((s) => <li key={s}>{label(s)}</li>)}</ul>}
        <p className="text-xs text-muted-foreground">This does not bypass this app's permissions or backend policies.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
        </div>
      </section>
    </main>
  );
}
