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
import { agents, type AgentId } from "@/lib/ghost";
import ghostMark from "@/assets/ghost-emblem.jpg";

type Thread = { id: string; title: string; updated_at: string };
const agentIcons = [Workflow, Code2, ScanLine, ShieldCheck, BookOpen, Scale];

export function GhostWorkspace({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId>("architect");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<"capabilities" | "models" | "profile" | null>(null);
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
      .then(({ data }) => {
        if (live) {
          setDisplayName(data?.display_name || "");
          setAvatarUrl(data?.avatar_url || "");
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
      avatar_url: avatarUrl.trim(),
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
              ABISINYA GHOST<small>INTELLIGENCE, UNBOUND.</small>
            </div>
          </Link>
          <Button className="new-chat" onClick={newThread} disabled={working}>
            <span className="flex items-center gap-2">
              <Plus size={16} />
              New conversation
            </span>
            <span className="font-mono text-xs">+</span>
          </Button>
          <div>
            <p className="side-label">WORKSPACE</p>
            <nav className="side-nav">
              <Button variant="ghost" className="nav-item active" asChild>
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <MessageSquare />
                  Ghost console
                </Link>
              </Button>
              <Button variant="ghost" className="nav-item" onClick={() => setPanel("capabilities")}>
                <LayoutGrid />
                Capabilities<span className="ml-auto font-mono text-[10px]">06</span>
              </Button>
              <Button variant="ghost" className="nav-item" onClick={() => setPanel("models")}>
                <Network />
                Model collective
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
                    onClick={() => setMobileOpen(false)}
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" referrerPolicy="no-referrer" />
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
              <span>Workspace</span>
              <ChevronRight size={12} />
              <strong>Ghost console</strong>
            </div>
            <div className="topbar-right">
              <span>
                <i className="status-dot" />
                WORKSPACE READY
              </span>
              <Button variant="ghost" className="model-label" onClick={() => setPanel("models")}>
                <Cpu size={13} />
                GHOST COLLECTIVE
                <ChevronRight size={10} />
              </Button>
            </div>
          </header>
          <section className="workspace-body">
            {threadId && user && initialMessages ? (
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
                    <p className="eyebrow">TWO MODELS. SIX PERSPECTIVES. ONE GHOST.</p>
                    <h1>
                      Great things start
                      <br className="sm:hidden" /> with <span>a thought.</span>
                    </h1>
                    <p className="welcome-subtitle">
                      Your ideas. A different kind of intelligence.
                      <br />
                      What are we building today?
                    </p>
                    <div className="model-pills">
                      <span className="model-pill">
                        <Cpu />
                        GPT-6 Astra
                      </span>
                      <Plus size={10} />
                      <span className="model-pill">
                        <Network />
                        Claude Fable 5.1
                      </span>
                      <span>→ GHOST</span>
                    </div>
                  </div>
                  <div className="agents-heading">
                    <span>CHOOSE YOUR PERSPECTIVE</span>
                    <span>06 SPECIALIST ROLES</span>
                  </div>
                  <div className="agent-grid">
                    {agents.map((a, i) => {
                      const Icon = agentIcons[i] || Workflow;
                      return (
                        <Button
                          variant="ghost"
                          className={`agent-card ${a.id === activeAgent ? "chosen" : ""}`}
                          key={a.id}
                          onClick={() => {
                            setActiveAgent(a.id);
                            document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
                          }}
                        >
                          <Icon className="agent-icon" />
                          <ArrowUpRight className="agent-arrow" />
                          <span className="agent-title">{a.name}</span>
                          <span className="agent-desc">{a.description}</span>
                        </Button>
                      );
                    })}
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
          <footer className="bottom-strip">
            <span>
              <span className="signal">◇</span> ABISINYA GHOST{" "}
              <span className="ml-2">/ INTELLIGENCE WORKSPACE</span>
            </span>
            <span>BUILT FOR THE POSSIBILITIES.</span>
          </footer>
        </main>
      </div>
      <GhostAuth open={authOpen} onOpenChange={setAuthOpen} />
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
                ? "The Ghost collective"
                : panel === "profile"
                  ? "Your account"
                  : "Ghost capabilities"}
            </DialogTitle>
            <DialogDescription>
              {panel === "models"
                ? "Two frontier models. One considered response."
                : panel === "profile"
                  ? "Make this workspace yours."
                  : "Six perspectives for safe, thoughtful work."}
            </DialogDescription>
          </DialogHeader>
          {panel === "models" ? (
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
                AI credits. No external tools, code execution, or live web access are connected.
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
                  <label className="form-field">
                    Avatar image address
                    <input
                      type="url"
                      placeholder="https://…"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
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
          placeholder="Give your next idea a starting point…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <PromptInputFooter>
          <span className="composer-context">
            <Cpu />
            {agents.find((a) => a.id === agent)?.name}
            <span>·</span>Ghost collective
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
  const textarea = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId, agent },
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
    [threadId, agent],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
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
                  GHOST<span className="text-muted-foreground">/ COLLECTIVE</span>
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
              <span>·</span>Ghost collective
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
