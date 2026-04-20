// yahoo.ts — fetches Yahoo Finance v8 chart endpoint via Node built-in fetch
// No crumb/cookie required when using query2 + mobile User-Agent.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  trailingPE?: number;
  currency: string;
  exchangeName: string;
}

export interface ChartData {
  timestamp: number[];
  close: number[];
  open: number[];
  high: number[];
  low: number[];
  volume: number[];
  meta: any;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Accept": "application/json",
};

async function fetchJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Single quote ─────────────────────────────────────────────────────────────

export async function fetchQuoteAsync(symbol: string): Promise<Quote | null> {
  try {
    const enc = encodeURIComponent(symbol);
    const data = await fetchJson(
      `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?range=1d&interval=1d`
    );
    const result = data?.chart?.result?.[0];
    if (!result?.meta?.regularMarketPrice) return null;

    const meta   = result.meta;
    const price  = meta.regularMarketPrice;
    const prev   = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;

    const q       = result.indicators?.quote?.[0] ?? {};
    const highs   = (q.high   ?? []).filter((v: any) => v != null);
    const lows    = (q.low    ?? []).filter((v: any) => v != null);
    const volumes = (q.volume ?? []).filter((v: any) => v != null);

    return {
      symbol:                     meta.symbol ?? symbol,
      shortName:                  meta.shortName ?? meta.longName ?? symbol,
      longName:                   meta.longName,
      regularMarketPrice:         price,
      regularMarketChange:        +change.toFixed(4),
      regularMarketChangePercent: +changePct.toFixed(4),
      regularMarketPreviousClose: prev,
      regularMarketDayHigh:       highs.length  ? Math.max(...highs)  : price,
      regularMarketDayLow:        lows.length   ? Math.min(...lows)   : price,
      regularMarketVolume:        volumes.length ? volumes.reduce((a: number, b: number) => a + b, 0) : 0,
      fiftyTwoWeekHigh:           meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow:            meta.fiftyTwoWeekLow  ?? 0,
      marketCap:                  meta.marketCap,
      currency:                   meta.currency ?? "USD",
      exchangeName:               meta.fullExchangeName ?? meta.exchangeName ?? "",
    };
  } catch (e: any) {
    console.warn(`[yahoo] quote failed for ${symbol}:`, e?.message?.slice(0, 80));
    return null;
  }
}

// Sync stub — routes use async version
export function fetchQuote(symbol: string): Quote | null { return null; }

// ─── Batch quotes ─────────────────────────────────────────────────────────────

export async function fetchQuotesAsync(symbols: string[]): Promise<Quote[]> {
  // Fetch in parallel batches of 6 to avoid overwhelming Yahoo
  const BATCH = 6;
  const results: Quote[] = [];
  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    const settled = await Promise.allSettled(chunk.map(s => fetchQuoteAsync(s)));
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
    if (i + BATCH < symbols.length) await sleep(200); // gentle pacing between batches
  }
  return results;
}

// Sync stub — routes use async version
export function fetchQuotes(symbols: string[]): Quote[] { return []; }

// ─── Chart ────────────────────────────────────────────────────────────────────

export async function fetchChartAsync(symbol: string, range = "1mo", interval = "1d"): Promise<ChartData | null> {
  try {
    const enc = encodeURIComponent(symbol);
    const data = await fetchJson(
      `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?range=${range}&interval=${interval}`
    );
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const ts     = result.timestamp ?? [];
    const q      = result.indicators?.quote?.[0] ?? {};
    const closes  = q.close  ?? [];
    const opens   = q.open   ?? [];
    const highs   = q.high   ?? [];
    const lows    = q.low    ?? [];
    const volumes = q.volume ?? [];

    const timestamps: number[] = [];
    const closesOut: number[]  = [];
    const opensOut:  number[]  = [];
    const highsOut:  number[]  = [];
    const lowsOut:   number[]  = [];
    const volumesOut: number[] = [];

    for (let i = 0; i < ts.length; i++) {
      if (closes[i] == null) continue;
      timestamps.push(ts[i]);
      closesOut.push(closes[i]);
      opensOut.push(opens[i]   ?? closes[i]);
      highsOut.push(highs[i]   ?? closes[i]);
      lowsOut.push(lows[i]     ?? closes[i]);
      volumesOut.push(volumes[i] ?? 0);
    }

    return {
      timestamp: timestamps,
      close:     closesOut,
      open:      opensOut,
      high:      highsOut,
      low:       lowsOut,
      volume:    volumesOut,
      meta:      result.meta ?? {},
    };
  } catch (e: any) {
    console.warn(`[yahoo] chart failed for ${symbol}:`, e?.message?.slice(0, 80));
    return null;
  }
}

// Sync stub
export function fetchChart(symbol: string, range = "1mo", interval = "1d"): ChartData | null { return null; }

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function fetchSummaryAsync(symbol: string): Promise<any> {
  try {
    const enc = encodeURIComponent(symbol);
    const data = await fetchJson(
      `https://query2.finance.yahoo.com/v11/finance/quoteSummary/${enc}?modules=summaryDetail,defaultKeyStatistics,assetProfile,financialData`
    );
    if (data?.quoteSummary?.result?.[0]) return data.quoteSummary.result[0];
    // Fallback: return chart meta
    const chart = await fetchChartAsync(symbol, "3mo", "1d");
    return chart ? { meta: chart.meta } : null;
  } catch (e: any) {
    console.warn(`[yahoo] summary failed for ${symbol}:`, e?.message?.slice(0, 80));
    return null;
  }
}

export function fetchSummary(symbol: string): any { return null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
