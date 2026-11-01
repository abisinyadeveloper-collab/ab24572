import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
function Reset() {
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const recovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user) && recovery));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.updateUser({ password });
            setNotice(error ? error.message : "Password updated. You can return to Ghost.");
          }}
        >
          <label className="form-field">
            New password
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button disabled={!ready}>Update password</Button>
        </form>
        {!ready && (
          <p className="form-note mt-4">
            Open the password recovery link from your email to continue.
          </p>
        )}
        <p role="status" className="form-note mt-4">
          {notice}
        </p>
        <Link to="/" className="mt-5 inline-block text-primary">
          Return to Ghost
        </Link>
      </div>
    </main>
  );
}
