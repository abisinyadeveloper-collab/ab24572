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
