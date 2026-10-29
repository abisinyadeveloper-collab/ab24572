import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import "@lovable.dev/cloud-auth-js/styles.css";
export function GhostAuth({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setNotice("Check your email for a reset link.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: "google" | "lovable") {
    setNotice("");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) setNotice(result.error.message);
    else if (!result.redirected) onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-panel max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "signup"
              ? "Create your Ghost account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome to Ghost"}
          </DialogTitle>
          <DialogDescription>Private conversations. A workspace of your own.</DialogDescription>
        </DialogHeader>
        {mode !== "reset" && (
          <>
            <div className="auth-actions">
              <Button variant="outline" onClick={() => social("google")}>
                Continue with Google
              </Button>
              <Button className="lovable-auth-button" onClick={() => social("lovable")}>
                Continue with Lovable
              </Button>
            </div>
            <div className="auth-divider">OR CONTINUE WITH EMAIL</div>
          </>
        )}
        <form onSubmit={submit}>
          <label className="form-field">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {mode !== "reset" && (
            <label className="form-field">
              Password
              <input
                type="password"
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}
          <Button className="w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>
        {notice && (
          <p role="status" className="form-note">
            {notice}
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setNotice("");
            }}
          >
            {mode === "signup" ? "Already have an account?" : "Create an account"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode(mode === "reset" ? "login" : "reset");
              setNotice("");
            }}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
