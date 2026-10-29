import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Plus,
  MessageSquare,
  LayoutGrid,
  ShieldCheck,
  Settings2,
  ChevronRight,
  Menu,
  X,
  Cpu,
  Code2,
  Workflow,
  ScanLine,
  BookOpen,
  Scale,
  ArrowUp,
  CircleHelp,
  LogOut,
  Trash2,
  Fingerprint,
  Network,
  Check,
  Loader2,
  ImagePlus,
  Film,
  Plug,
  Copy,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { GhostAuth } from "./ghost-auth";
import { GhostVoiceDialog } from "./ghost-voice";
import { GhostStudio } from "./ghost-studio";
import { Mic as MicIcon } from "lucide-react";
import { agents, tiers, type AgentId, type TierId } from "@/lib/ghost";
import ghostMark from "@/assets/ghost-emblem.jpg";

type Thread = { id: string; title: string; updated_at: string };
const agentIcons = [Workflow, Code2, ScanLine, ShieldCheck, BookOpen, Scale];

export function GhostWorkspace({ threadId, initialView = "chat" }: { threadId?: string; initialView?: "chat" | "image" | "video" }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId>("architect");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const view = initialView;
  function setView(next: "chat" | "image" | "video") {
    void navigate({ to: next === "image" ? "/images" : next === "video" ? "/videos" : "/" });
  }
  const [panel, setPanel] = useState<"capabilities" | "models" | "profile" | "connections" | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(threadId ? null : []);
  const [loadError, setLoadError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileNote, setProfileNote] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) {
        setUser(data.user);
        setAuthReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        setAuthReady(true);
      }
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function refreshThreads() {
    const { data, error } = await supabase
      .from("ghost_threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) setLoadError(error.message);
    else setThreads(data || []);
  }
  useEffect(() => {
    let live = true;
    if (!user) {
      setThreads([]);
      setDisplayName("");
      setAvatarUrl("");
      setAvatarPath("");
      setAvatarSrc("");
      if (threadId) setInitialMessages(null);
      return;
    }
    void supabase
      .from("ghost_threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (live) {
          if (error) setLoadError(error.message);
          else setThreads(data || []);
        }
      });
    void supabase
      .from("profiles")
      .select("display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!live) return;
        setDisplayName(data?.display_name || "");
        const stored = data?.avatar_url || "";
        if (stored.startsWith("avatars:")) {
          const path = stored.slice("avatars:".length);
          setAvatarPath(path);
          setAvatarUrl("");
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, 60 * 60);
          if (live) setAvatarSrc(signed?.signedUrl || "");
        } else {
          setAvatarPath("");
          setAvatarUrl(stored);
          setAvatarSrc(stored);
        }
      });
    if (threadId)
      void supabase
        .from("ghost_threads")
        .select("messages")
        .eq("id", threadId)
        .single()
        .then(({ data, error }) => {
          if (live) {
            if (error) setLoadError("This conversation is unavailable.");
            else
              setInitialMessages(
                (Array.isArray(data.messages) ? data.messages : []) as unknown as UIMessage[],
              );
          }
        });
    return () => {
      live = false;
    };
  }, [user, threadId]);
  async function newThread() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setWorking(true);
    const { data, error } = await supabase
      .from("ghost_threads")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    setWorking(false);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setMobileOpen(false);
    setView("chat");
    await navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
  }
  async function deleteThread(id: string) {
    const { error } = await supabase.from("ghost_threads").delete().eq("id", id);
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (id === threadId) await navigate({ to: "/" });
    else await refreshThreads();
  }
  async function uploadAvatar(file: File) {
    if (!user) return;
    setProfileNote("");
    if (!file.type.startsWith("image/")) {
      setProfileNote("Choose an image file (PNG, JPG, or similar).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileNote("Images up to 2 MB are supported.");
      return;
    }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (error) {
      setAvatarUploading(false);
      setProfileNote(error.message);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    setAvatarPath(path);
    setAvatarUrl("");
    setAvatarSrc(signed?.signedUrl || "");
    setAvatarUploading(false);
    setProfileNote("Photo ready — save details to keep it.");
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileNote("");
    if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) {
      setProfileNote("Use a secure HTTPS image address.");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim().slice(0, 60),
      avatar_url: avatarPath ? `avatars:${avatarPath}` : avatarUrl.trim(),
    });
    setProfileNote(error ? error.message : "Account details saved.");
  }
  const userLabel = displayName || user?.email?.split("@")[0] || "Your workspace";
  return (
    <TooltipProvider>
      <div className="ghost-app">
        {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
        <aside className={`ghost-sidebar ${mobileOpen ? "open" : ""}`}>
          <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
            <img src={ghostMark} alt="Ghost emblem" width={36} height={39} />
            <div>
              Ghost<small>ABISINYA</small>
            </div>
          </Link>
          <Button className="new-chat" onClick={newThread} disabled={working}>
            <span className="flex items-center gap-2">
              <Plus size={16} />
              New chat
            </span>
            <span className="font-mono text-xs">+</span>
          </Button>
          <div>
            <p className="side-label">WORKSPACE</p>
            <nav className="side-nav">
              <Button variant="ghost" className={`nav-item ${view === "chat" ? "active" : ""}`} asChild>
                <Link to="/" onClick={() => { setMobileOpen(false); setView("chat"); }}>
                  <MessageSquare />
                  Chat
                </Link>
              </Button>
              <Button variant="ghost" className="nav-item" onClick={() => (user ? setVoiceOpen(true) : setAuthOpen(true))}>
                <MicIcon />
                Live voice
              </Button>
              <Button variant="ghost" className={`nav-item ${view === "image" ? "active" : ""}`} onClick={() => { setView("image"); setMobileOpen(false); }}>
                <ImagePlus />Images
              </Button>
              <Button variant="ghost" className={`nav-item ${view === "video" ? "active" : ""}`} onClick={() => { setView("video"); setMobileOpen(false); }}>
                <Film />Videos
              </Button>
              <Button variant="ghost" className="nav-item" onClick={() => setPanel("connections")}>
                <Plug />Connections
              </Button>
            </nav>
          </div>
          <div className="sidebar-history">
            <p className="side-label">RECENT CONVERSATIONS</p>
            {threads.length ? (
              threads.map((t) => (
                <div className="history-row" key={t.id}>
                  <Link
                    className={`thread-link ${threadId === t.id ? "selected" : ""}`}
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    onClick={() => { setMobileOpen(false); setView("chat"); }}
                  >
                    {t.title}
                  </Link>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title="Delete conversation"
                    aria-label={`Delete ${t.title}`}
                    onClick={() => deleteThread(t.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))
            ) : threadId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                {!loadError && (user || !authReady) && <Loader2 className="animate-spin text-muted-foreground" />}
                <p role="status" className="form-note">{loadError || (!authReady ? "Opening your conversation…" : !user ? "Sign in to open your saved conversation." : "Loading your conversation…")}</p>
                {authReady && !user && <Button onClick={() => setAuthOpen(true)}>Sign in</Button>}
                {loadError && <Button variant="outline" onClick={() => void navigate({ to: "/" })}>New chat</Button>}
              </div>
            ) : (
              <p className="empty-history">
                {user
                  ? "Your next idea starts here."
                  : "Sign in to keep your conversations together."}
              </p>
            )}
          </div>
          <div className="side-nav">
            <Button variant="ghost" className="nav-item" onClick={() => setPanel("capabilities")}>
              <CircleHelp />
              About Ghost
              <ArrowUpRight className="ml-auto size-3" />
            </Button>
          </div>
          <div className="side-bottom">
            <Button
              variant="ghost"
              className="account-button"
              onClick={() => (user ? setPanel("profile") : setAuthOpen(true))}
            >
              <span className="account-avatar">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Your avatar" referrerPolicy="no-referrer" />
                ) : (
                  <Fingerprint size={16} />
                )}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs">{userLabel}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {user ? "Personal account" : "Sign in to get started"}
                </span>
              </span>
              <Settings2 size={14} />
            </Button>
          </div>
        </aside>
        <main className="workspace">
          <header className="workspace-topbar">
            <div className="workspace-crumb">
              <Button
                size="icon-sm"
                variant="ghost"
                className="mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X /> : <Menu />}
              </Button>
              <strong>Ghost</strong>
              <span className="topbar-section">{view === "chat" ? "" : "Studio"}</span>
            </div>
            <div className="topbar-right">
              <Button variant="ghost" size="icon-sm" title="Start live voice" aria-label="Start live voice" onClick={() => user ? setVoiceOpen(true) : setAuthOpen(true)}><MicIcon /></Button>
              <Button variant="ghost" className="model-label" onClick={() => setPanel("models")}>
                Ghost <ChevronRight size={12} />
              </Button>
            </div>
          </header>
          <section className="workspace-body">
            {view !== "chat" ? (
              <GhostStudio key={view} userId={user?.id} onSignIn={() => setAuthOpen(true)} initialMode={view} />
            ) : threadId && user && initialMessages ? (
              <GhostChat
                key={`${user.id}-${threadId}`}
                threadId={threadId}
                initialMessages={initialMessages}
                agent={activeAgent}
                onAgentChange={setActiveAgent}
                onFinish={refreshThreads}
              />
            ) : (
              <>
                <div className="welcome">
                  <div className="welcome-intro">
                    <img
                      className="ghost-portrait"
                      src={ghostMark}
                      alt="ABISINYA GHOST"
                      width={140}
                      height={140}
                    />
                    <h1>What’s on your mind?</h1>
                    <p className="welcome-subtitle">Think it through with Ghost.</p>
                  </div>
                  <div className="quick-actions">
                    <Button variant="outline" onClick={() => setView("image")}><ImagePlus />Create an image</Button>
                    <Button variant="outline" onClick={() => setView("video")}><Film />Make a video</Button>
                    <Button variant="outline" onClick={() => user ? setVoiceOpen(true) : setAuthOpen(true)}><MicIcon />Talk to Ghost</Button>
                  </div>
                  {threadId && (
                    <p role="status" className="form-note mt-4">
                      {loadError ||
                        (!authReady
                          ? "Opening your workspace…"
                          : !user
                            ? "Sign in to open your saved conversation."
                            : "Loading your conversation…")}
                    </p>
                  )}
                </div>
                <div className="composer-region">
                  {loadError && !threadId && (
                    <p role="alert" className="chat-error">
                      {loadError}
                    </p>
                  )}
                  <StarterComposer
                    agent={activeAgent}
                    onSend={async (text) => {
                      if (!user) {
                        setAuthOpen(true);
                        return;
                      }
                      setWorking(true);
                      const { data, error } = await supabase
                        .from("ghost_threads")
                        .insert({ user_id: user.id, title: text.slice(0, 65), messages: [] })
                        .select("id")
                        .single();
                      setWorking(false);
                      if (error) {
                        setLoadError(error.message);
                        return;
                      }
                      sessionStorage.setItem(`ghost-draft-${data.id}`, text);
                      await navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
                    }}
                    busy={working}
                  />
                </div>
              </>
            )}
          </section>
        </main>
      </div>
      <GhostAuth open={authOpen} onOpenChange={setAuthOpen} />
      <GhostVoiceDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
      <Dialog
        open={panel !== null}
        onOpenChange={(v) => {
          if (!v) setPanel(null);
        }}
      >
        <DialogContent className="modal-panel max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {panel === "models"
                ? "Ghost models"
                : panel === "profile"
                  ? "Your account"
                  : panel === "connections" ? "Connections" : "About Ghost"}
            </DialogTitle>
            <DialogDescription>
              {panel === "models"
                ? "Lite, Ayna, and Ghost."
                : panel === "profile"
                  ? "Make this workspace yours."
                  : panel === "connections" ? "Your services, connected to Ghost." : "Your personal AI assistant."}
            </DialogDescription>
          </DialogHeader>
          {panel === "connections" ? (
            <div className="connection-list">
              <div className="connection-row"><BookOpen/><strong>Public web search</strong><span className="text-signal">Connected</span></div>
              {["Gmail", "Google Calendar", "Google Slides", "TikTok", "X", "Telegram", "WhatsApp Business", "Meta ads"].map(name => <div className="connection-row" key={name}><Plug/><strong>{name}</strong><span>Setup required</span></div>)}
              <p className="form-note">A workspace owner must configure each service before you can connect your own account. Ghost never uses someone else’s private accounts.</p>
            </div>
          ) : panel === "models" ? (
            <>
              <div className="capability-row">
                <span className="capability-status">01 / DRAFT & REASON</span>
                <p>
                  <strong>GPT-6 Astra</strong>
                </p>
                <p>Develops a first perspective using your complete conversation.</p>
              </div>
              <div className="capability-row">
                <span className="capability-status">02 / REVIEW & SYNTHESIZE</span>
                <p>
                  <strong>Claude Fable 5.1</strong>
                </p>
                <p>Reviews the draft and writes Ghost’s final response.</p>
              </div>
              <p className="form-note">
                Ghost coordinates existing models; it is not a newly trained model. Both calls use
                AI credits. Public web search is connected; Ghost does not run code on your computer.
              </p>
            </>
          ) : panel === "profile" ? (
            <>
              {user ? (
                <form onSubmit={saveProfile}>
                  <label className="form-field">
                    Display name
                    <input
                      value={displayName}
                      maxLength={60}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </label>
                  <div className="form-field">
                    Profile photo
                    <div className="avatar-upload">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Your avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="avatar-placeholder">
                          {(displayName || user.email || "G").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <label className="avatar-upload-btn">
                        {avatarUploading ? <Loader2 className="animate-spin" /> : <Plus />}
                        {avatarUploading ? "Uploading…" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={avatarUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadAvatar(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <label className="form-field">
                    Or paste an image address
                    <input
                      type="url"
                      placeholder="https://…"
                      value={avatarUrl}
                      onChange={(e) => {
                        setAvatarUrl(e.target.value);
                        setAvatarPath("");
                        setAvatarSrc(e.target.value);
                      }}
                    />
                  </label>
                  <p className="form-note">{user.email}</p>
                  <div className="mt-5 flex justify-between gap-3">
                    <Button type="submit">
                      <Check />
                      Save details
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setPanel(null);
                        await navigate({ to: "/" });
                      }}
                    >
                      <LogOut />
                      Sign out
                    </Button>
                  </div>
                  {profileNote && (
                    <p role="status" className="form-note mt-4">
                      {profileNote}
                    </p>
                  )}
                </form>
              ) : (
                <Button
                  onClick={() => {
                    setPanel(null);
                    setAuthOpen(true);
                  }}
                >
                  Sign in
                </Button>
              )}
            </>
          ) : (
            <>
              {agents.map((a) => (
                <div className="capability-row" key={a.id}>
                  <strong>{a.name}</strong>
                  <p>{a.description}</p>
                  <span className="capability-status">TEXT ASSISTANCE</span>
                </div>
              ))}
              <p className="form-note">
                Ghost does not perform hacking, surveillance, fraud, weapon operations, or clinical
                diagnosis. The uploaded manifesto includes unverified and speculative claims; these
                are not active capabilities.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
function ComposerNote() {
  return (
    <div className="composer-footer">
      <span>
        <ShieldCheck size={11} />
        Private to your account
      </span>
      <span>AI can make mistakes. Verify important information.</span>
    </div>
  );
}
function StarterComposer({
  agent,
  onSend,
  busy,
}: {
  agent: AgentId;
  onSend: (s: string) => Promise<void>;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <>
      <PromptInput
        className="composer"
        onSubmit={async ({ text: submitted }) => {
          if (submitted.trim()) await onSend(submitted.trim());
        }}
      >
        <PromptInputTextarea
          aria-label="Message Ghost"
          placeholder="Ask Ghost anything…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <PromptInputFooter>
          <span className="composer-context">
            <Cpu />
            {agents.find((a) => a.id === agent)?.name}
            <span>·</span>Ghost
          </span>
          <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy || !text.trim()}>
            <ArrowUp size={16} />
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
      <ComposerNote />
    </>
  );
}
function GhostChat({
  threadId,
  initialMessages,
  agent,
  onAgentChange,
  onFinish,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  agent: AgentId;
  onAgentChange: (id: AgentId) => void;
  onFinish: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("");
  const [tier, setTier] = useState<TierId>("ghost");
  useEffect(() => {
    const saved = window.localStorage.getItem("ghost-tier");
    if (saved && tiers.some((t) => t.id === saved)) setTier(saved as TierId);
  }, []);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId, agent, tier },
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return { Authorization: `Bearer ${data.session?.access_token || ""}` };
        },
        prepareSendMessagesRequest: ({ messages, ...rest }) => ({
          ...(rest.headers ? { headers: rest.headers } : {}),
          body: {
            ...rest.body,
            threadId,
            agent,
            tier,
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              parts: m.parts
                .filter((p) => p.type === "text")
                .map((p) => ({ type: "text", text: "text" in p ? p.text : "" })),
            })),
          },
        }),
      }),
    [threadId, agent, tier],
  );
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onData: (part) => {
      if (part.type === "data-phase") {
        const data = part.data as { label: string };
        setPhase(data.label);
      }
    },
    onFinish: () => {
      setPhase("");
      void onFinish();
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (!busy) textarea.current?.focus();
  }, [busy]);
  useEffect(() => {
    if (started.current) return;
    const frame = requestAnimationFrame(() => {
      if (started.current) return;
      const draft = sessionStorage.getItem(`ghost-draft-${threadId}`);
      if (draft && initialMessages.length === 0) {
        started.current = true;
        sessionStorage.removeItem(`ghost-draft-${threadId}`);
        void sendMessage({ text: draft });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [threadId, initialMessages.length, sendMessage]);
  return (
    <>
      <Conversation className="transcript">
        <ConversationContent className="transcript-inner">
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <h2 className="text-xl font-semibold">A new conversation.</h2>
              <p className="form-note mt-3">What’s on your mind?</p>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              {m.role === "assistant" && (
                <div className="message-label">
                  <img src={ghostMark} alt="" width={24} height={24} />
                  Ghost
                </div>
              )}
              <MessageContent>
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    <MessageResponse key={i}>{p.text}</MessageResponse>
                  ) : p.type === "reasoning" ? (
                    <details className="chat-reasoning" key={i}>
                      <summary>Reasoning summary</summary>
                      <MessageResponse>{p.text}</MessageResponse>
                    </details>
                  ) : null,
                )}
              </MessageContent>
              {m.role === "assistant" && !busy && <div className="message-actions"><Button size="icon-sm" variant="ghost" title="Copy answer" aria-label="Copy answer" onClick={() => void navigator.clipboard.writeText(m.parts.filter(p => p.type === "text").map(p => p.text).join("\n"))}><Copy/></Button>{m.id === messages.at(-1)?.id && <Button size="icon-sm" variant="ghost" title="Regenerate answer" aria-label="Regenerate answer" onClick={() => void regenerate()}><RotateCcw/></Button>}</div>}
            </Message>
          ))}
          {busy && (
            <div className="chat-waiting">
              <Shimmer>{phase || "Ghost is considering your message…"}</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="composer-region">
        {error && (
          <p role="alert" className="chat-error">
            {error.message}
          </p>
        )}
        <PromptInput
          className="composer"
          onSubmit={async ({ text: submitted }) => {
            if (!submitted.trim() || busy) return;
            setText("");
            textarea.current?.focus();
            await sendMessage({ text: submitted.trim() });
          }}
        >
          <PromptInputTextarea
            ref={textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Continue the conversation…"
            aria-label="Message Ghost"
            autoFocus
          />
          <PromptInputFooter>
            <label className="composer-context">
              <Cpu />
              <select
                aria-label="Agent perspective"
                value={agent}
                onChange={(e) => onAgentChange(e.target.value as AgentId)}
                disabled={busy}
                className="bg-card text-foreground outline-none"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <span>·</span>
              <select
                aria-label="Ghost model"
                value={tier}
                onChange={(e) => {
                  setTier(e.target.value as TierId);
                  window.localStorage.setItem("ghost-tier", e.target.value);
                }}
                disabled={busy}
                className="bg-card text-foreground outline-none"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <PromptInputSubmit
              status={status}
              onStop={() => {
                void stop();
                setPhase("");
              }}
              disabled={!busy && !text.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
        <ComposerNote />
      </div>
    </>
  );
}
