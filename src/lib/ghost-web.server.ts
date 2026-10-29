// Server-only: public web + social search through Firecrawl (Lovable connector gateway).
const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

export function wantsWeb(text: string, agent: string) {
  if (agent === "researcher") return true;
  return /https?:\/\/|\b(search|latest|news|today|trend|find|look up|tafuta)\b/i.test(text);
}

async function call(path: string, body: unknown) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const fc = process.env["FIRECRAWL_API_KEY"];
  if (!lovable || !fc) throw new Error("Web search is not configured.");
  const res = await fetch(`${GATEWAY}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": fc,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Web search failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Returns a compact context block with sources, or "" on failure. */
export async function gatherWebContext(text: string): Promise<string> {
  const urls = (text.match(/https?:\/\/[^\s)]+/g) || []).slice(0, 2);
  const parts: string[] = [];
  try {
    for (const url of urls) {
      const r = await call("scrape", { url, formats: ["markdown"], onlyMainContent: true });
      const md: string = r.markdown ?? r.data?.markdown ?? "";
      if (md) parts.push(`SOURCE ${url}\n${md.slice(0, 6000)}`);
    }
    const query = text.replace(/https?:\/\/\S+/g, "").trim().slice(0, 300);
    if (query.length > 3) {
      const r = await call("search", {
        query,
        limit: 6,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      });
      const items: Array<{ url?: string; title?: string; description?: string; markdown?: string }> =
        Array.isArray(r.data) ? r.data : (r.data?.web ?? []);
      for (const it of items) {
        parts.push(
          `SOURCE ${it.url} — ${it.title ?? ""}\n${(it.markdown || it.description || "").slice(0, 2500)}`,
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
  return parts.join("\n\n---\n\n").slice(0, 24000);
}
