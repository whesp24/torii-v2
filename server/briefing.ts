import { execSync } from "child_process";

function curlJson(url: string): any {
  try {
    const cmd = `curl -s --max-time 15 -H "User-Agent: Mozilla/5.0" -H "Accept: application/json" "${url}"`;
    return JSON.parse(execSync(cmd, { encoding: "utf-8" }));
  } catch { return null; }
}

// Generate briefing using Perplexity API (if key available) or compose from data
export async function generateBriefing(marketData: any, portfolioData: any, newsHeadlines: string[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY;

  // Build context string
  const nikkei = marketData.japan?.find((q: any) => q.symbol === "^N225");
  const usdjpy = marketData.japan?.find((q: any) => q.symbol === "USDJPY=X");
  const vix = marketData.macro?.find((q: any) => q.symbol === "^VIX");
  const spx = marketData.macro?.find((q: any) => q.symbol === "^GSPC");

  const portfolioLines = (portfolioData || []).map((h: any) =>
    `${h.ticker}: $${h.price?.toFixed(2)} (${h.changePct >= 0 ? "+" : ""}${h.changePct?.toFixed(2)}%)`
  ).join(", ");

  const headlines = newsHeadlines.slice(0, 8).join("\n- ");

  const prompt = `You are a financial analyst writing a morning briefing for a private investor. Write a concise, insightful daily market briefing in plain English. Use bullet points where helpful. Cover:

1. **Japan Market** — Nikkei 225: ${nikkei ? `${nikkei.regularMarketPrice?.toLocaleString()} (${nikkei.regularMarketChangePercent >= 0 ? "+" : ""}${nikkei.regularMarketChangePercent?.toFixed(2)}%)` : "N/A"}, USD/JPY: ${usdjpy?.regularMarketPrice?.toFixed(3) || "N/A"}
2. **Portfolio** — Holdings today: ${portfolioLines || "N/A"}
3. **Global Macro** — S&P 500: ${spx ? `${spx.regularMarketPrice?.toLocaleString()} (${spx.regularMarketChangePercent >= 0 ? "+" : ""}${spx.regularMarketChangePercent?.toFixed(2)}%)` : "N/A"}, VIX: ${vix?.regularMarketPrice?.toFixed(2) || "N/A"}
4. **Today's Headlines**:
- ${headlines}
5. **What to Watch** — Key events or risks for the coming days based on the above context.

Keep the briefing under 400 words. Be direct, specific, and actionable. Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

  if (apiKey) {
    try {
      const isPerplexity = !!process.env.PERPLEXITY_API_KEY;
      const endpoint = isPerplexity
        ? "https://api.perplexity.ai/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const model = isPerplexity ? "llama-3.1-sonar-small-128k-online" : "gpt-4o-mini";

      const body = JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });

      const cmd = `curl -s --max-time 30 -X POST "${endpoint}" -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`;
      const raw = execSync(cmd, { encoding: "utf-8" });
      const resp = JSON.parse(raw);
      const content = resp?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      console.error("AI briefing API failed:", e);
    }
  }

  // Fallback: compose briefing from data without AI
  const nikkeiStr = nikkei
    ? `Nikkei 225 is at **${nikkei.regularMarketPrice?.toLocaleString()}**, ${nikkei.regularMarketChangePercent >= 0 ? "up" : "down"} **${Math.abs(nikkei.regularMarketChangePercent).toFixed(2)}%** today.`
    : "Nikkei 225 data unavailable.";

  const usdjpyStr = usdjpy
    ? `USD/JPY is trading at **${usdjpy.regularMarketPrice?.toFixed(3)}**.`
    : "";

  const spxStr = spx
    ? `S&P 500 at **${spx.regularMarketPrice?.toLocaleString()}** (${spx.regularMarketChangePercent >= 0 ? "+" : ""}${spx.regularMarketChangePercent?.toFixed(2)}%).`
    : "";

  const vixStr = vix ? `VIX at **${vix.regularMarketPrice?.toFixed(2)}**.` : "";

  const topMovers = (portfolioData || [])
    .filter((h: any) => h.changePct != null)
    .sort((a: any, b: any) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 3)
    .map((h: any) => `**${h.ticker}** ${h.changePct >= 0 ? "+" : ""}${h.changePct.toFixed(2)}%`)
    .join(", ");

  return `## Market Briefing — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}

### Japan Market
${nikkeiStr} ${usdjpyStr}

### Your Portfolio
Today's biggest movers: ${topMovers || "Price data loading — markets may be closed or data refreshing."}

### Global Macro
${spxStr} ${vixStr}

### Headlines
${newsHeadlines.slice(0, 5).map(h => `- ${h}`).join("\n")}

### What to Watch
Monitor upcoming BOJ policy signals and USD/JPY movement. Any shift above 160 JPY warrants attention for Japan-exposed positions like MUFG.

*Add an OpenAI or Perplexity API key in Settings for a richer AI-generated briefing.*`;
}
