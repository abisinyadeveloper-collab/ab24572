<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Ghost uses AI Elements and AI SDK UI-message streaming, with account-owned conversations stored in Cloud and thread IDs in page URLs, so history stays isolated and reloadable.
- AI providers and safety instructions live in server-only helpers; Astra drafts and Fable synthesizes sequentially, so Ghost is a workflow rather than a claimed trained model.
- Durable gateway access blocks are stored server-side and checked before any model call; never automatically retry blocked calls.

- Live web/social context comes from Firecrawl search in a server-only helper, injected before drafting, so private connector keys never reach the browser.
- Live voice runs through a persistent WebSocket relay (/api/live, src/lib/live-relay.server.ts) dispatched in src/server.ts and live-vite-plugin.ts in dev; the relay verifies the caller's sign-in token from app.start before opening a paid Gateway session.
- Creative media uses authenticated streaming image routes and authenticated video functions; account-owned files live in private storage and video jobs serialize across the project to prevent duplicate concurrent generation.
- Voice language is a validated startup choice with a server-owned translated greeting; changing language requires a new call so lifecycle and billing remain predictable.
- Chat, image studio, and video studio each have a content route and unique metadata; the shared workspace preserves consistent account navigation.
- Auto tier and memory extraction are deterministic rules in src/lib/ghost.ts (no extra model call), so routing is free, fast and testable.
- Memories and activity rows are owner-scoped tables written with the caller's own token (chat and voice relay), never the admin client.
- Shared deterministic memory helpers deduplicate facts, prioritize recent corrections and select relevant personalization; caller-scoped server helpers handle chat saves/forgetting and supply chat, voice reasoning and media so model behavior stays consistent without additional AI calls.
- External AI clients connect via the app MCP server in src/lib/mcp (OAuth via managed auth, caller-scoped client) so tools always act as the signed-in user under RLS.
- Native phone shell uses Capacitor loading the hosted site (server.url in capacitor.config.ts) because the app is SSR and can't ship as static files.
- The launch splash mounts once in the root alongside the workspace, with its own head-loaded stylesheet and a bounded dismissal timer, so navigation and loading failures cannot trap users behind it.
- Telegram identities come only from secret-verified webhook sender IDs in matching private chats; register users server-side and scope all history by that ID to prevent cross-user access.
- Telegram media uses separate sender-owned records and private storage, reuses the website's model settings and durable AI blocks, and collects videos only on explicit /status requests to avoid unattended paid jobs.
- Uploaded Office documents are parsed as bounded text using pure-JavaScript ZIP/XML readers; PDFs and supported images use native model inputs, and unsupported binaries are rejected rather than executed.
- Offline mode: vite-plugin-pwa generateSW writes /sw.js into dist/client, registered only via src/lib/pwa-register.ts (refuses dev/preview/iframes); chats and the send queue are cached per device in src/lib/offline-cache.ts, so the app opens and queues messages without internet.
