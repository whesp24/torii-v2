import { execSync } from "child_process";
import * as xml2js from "xml2js";

function curlText(url: string): string {
  try {
    const cmd = `curl -s --max-time 12 -L -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "${url}"`;
    return execSync(cmd, { encoding: "utf-8", timeout: 14000 });
  } catch { return ""; }
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  publishedMs: number;
  category: string;
  tags: string[];
  language: "en" | "ja";
  importance: "high" | "medium" | "low";
  importanceScore: number; // 0–100
  importanceReasons: string[];
}

// Portfolio tickers → keyword mapping
const TICKER_KEYWORDS: Record<string, string[]> = {
  MUFG: ["mufg", "mitsubishi ufj", "mitsubishi financial"],
  TM:   ["toyota"],
  HMC:  ["honda"],
  NTDOY:["nintendo"],
  NVDA: ["nvidia", "nvda"],
  AMD:  ["amd", "advanced micro devices"],
  GOOGL:["google", "alphabet"],
  VOO:  ["s&p 500", "vanguard", "sp500"],
  VRT:  ["vertiv"],
  ONDS: ["ondas"],
  CRCL: ["circle", "usdc", "circle internet"],
  QXO:  ["qxo"],
  TPL:  ["texas pacific"],
  MMS:  ["maximus"],
};

// High-importance trigger words
const HIGH_IMPORTANCE_KEYWORDS = [
  "crash", "collapse", "plunge", "surge", "soar", "record high", "record low",
  "emergency", "ban", "sanction", "default", "recession", "crisis", "war",
  "fed rate", "rate cut", "rate hike", "interest rate", "inflation", "cpi", "gdp",
  "earnings", "beat", "miss", "guidance", "dividend", "buyback", "merger", "acquisition",
  "ipo", "bankruptcy", "delisted", "investigation", "sec", "fraud",
  "bank of japan", "boj", "yield curve", "yen", "nikkei", "tariff", "trade war",
  "nvidia", "nvidia earnings", "apple earnings", "fed decision", "fomc",
];

const MEDIUM_IMPORTANCE_KEYWORDS = [
  "growth", "profit", "revenue", "sales", "market", "forecast", "outlook",
  "upgrade", "downgrade", "analyst", "target price", "partnership",
  "japan", "japanese", "nikkei", "tokyo", "asia", "semiconductor",
  "ai", "artificial intelligence", "chip", "supply chain",
];

function scoreImportance(title: string, summary: string, tags: string[]): { importance: "high" | "medium" | "low"; score: number; reasons: string[] } {
  const text = (title + " " + summary).toLowerCase();
  const reasons: string[] = [];
  let score = 10; // base

  // Portfolio ticker mention = high importance
  if (tags.length > 0) {
    score += 40;
    reasons.push(`Mentions portfolio holding${tags.length > 1 ? "s" : ""}: ${tags.join(", ")}`);
  }

  // High-importance keywords
  const highMatches = HIGH_IMPORTANCE_KEYWORDS.filter(kw => text.includes(kw));
  if (highMatches.length > 0) {
    score += Math.min(40, highMatches.length * 15);
    reasons.push(`Key event: ${highMatches.slice(0, 3).join(", ")}`);
  }

  // Medium keywords
  const medMatches = MEDIUM_IMPORTANCE_KEYWORDS.filter(kw => text.includes(kw));
  if (medMatches.length > 0) {
    score += Math.min(20, medMatches.length * 5);
    if (reasons.length === 0) reasons.push(`Market relevance: ${medMatches.slice(0, 2).join(", ")}`);
  }

  // Recency bonus: articles < 2 hours old
  // (handled outside this fn since we don't have publishedMs here)

  score = Math.min(100, score);
  const importance: "high" | "medium" | "low" = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  if (reasons.length === 0) reasons.push("General market news");
  return { importance, score, reasons };
}

function tagArticle(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [ticker, keywords] of Object.entries(TICKER_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) tags.push(ticker);
  }
  return tags;
}

function hashId(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function parseRss(xml: string): Promise<any[]> {
  if (!xml || xml.length < 50) return [];
  try {
    const result = await xml2js.parseStringPromise(xml, { explicitArray: false });
    const items = result?.rss?.channel?.item || result?.feed?.entry || [];
    return Array.isArray(items) ? items : [items];
  } catch { return []; }
}

function buildArticle(
  item: any,
  source: string,
  sourceUrl: string,
  category: string,
): Article | null {
  const title = (item.title?._ || item.title || "").trim();
  const desc = (item.description?._ || item.description || item["content:encoded"] || item.summary || "").replace(/<[^>]+>/g, "").trim().slice(0, 300);
  const rawLink = item.link?._ || item.link || item.guid?._ || item.guid || "";
  const url = typeof rawLink === "object" ? rawLink._ || "" : rawLink;
  const pub = item.pubDate || item.published || item["dc:date"] || "";
  const ms = pub ? new Date(pub).getTime() : Date.now();
  if (!title || !url) return null;
  const tags = tagArticle(title + " " + desc);
  const { importance, score, reasons } = scoreImportance(title, desc, tags);
  return {
    id: hashId((url || title) + source),
    title,
    summary: desc.slice(0, 280),
    url,
    source,
    sourceUrl,
    publishedAt: new Date(ms).toISOString(),
    publishedMs: ms,
    category,
    tags,
    language: "en",
    importance,
    importanceScore: score,
    importanceReasons: reasons,
  };
}

// ── Feed fetchers ─────────────────────────────────────────────────────────────

async function fetchFeed(url: string, source: string, sourceUrl: string, category: string, limit = 20): Promise<Article[]> {
  const xml = curlText(url);
  const items = await parseRss(xml);
  return items.slice(0, limit)
    .map(item => buildArticle(item, source, sourceUrl, category))
    .filter((a): a is Article => a !== null);
}

// Finance thought leaders — via their public Substack/blog RSS feeds
// These work reliably without API keys or whitelisting
const VOICES_FEEDS = [
  // Substacks
  { url: "https://www.morganhousel.com/feed",                    name: "@Morgan Housel",      category: "markets" },
  { url: "https://collabfund.com/blog/feed.rss",                  name: "@Collab Fund",        category: "markets" },
  { url: "https://feeds.feedburner.com/ReformedBroker",           name: "@Josh Brown",         category: "markets" },
  { url: "https://www.rationalwalk.com/feed/",                    name: "@Rational Walk",      category: "markets" },
  { url: "https://aswathdamodaran.blogspot.com/feeds/posts/default", name: "@Damodaran",       category: "markets" },
  { url: "https://ritholtz.com/feed/",                            name: "@Barry Ritholtz",     category: "markets" },
  // Finance Reddit (public RSS, no auth needed)
  { url: "https://www.reddit.com/r/investing/top/.rss?t=day",     name: "Reddit Investing",   category: "markets" },
  { url: "https://www.reddit.com/r/stocks/top/.rss?t=day",        name: "Reddit Stocks",      category: "markets" },
  { url: "https://www.reddit.com/r/wallstreetbets/top/.rss?t=day",name: "Reddit WSB",         category: "markets" },
  { url: "https://www.reddit.com/r/japanfinance/new/.rss",        name: "Reddit Japan Finance",category: "japan" },
  // Other finance blogs
  { url: "https://feeds.feedburner.com/CalculatedRisk",           name: "Calculated Risk",    category: "macro" },
  { url: "https://www.abnormalreturns.com/feed/",                 name: "Abnormal Returns",   category: "markets" },
];

async function fetchVoicesFeeds(): Promise<Article[]> {
  const fetches = VOICES_FEEDS.map(({ url, name, category }) =>
    fetchFeed(url, name, url, category, 8)
      .then(articles => articles.map(a => ({ ...a, source: name })))
  );
  const results = await Promise.allSettled(fetches);
  const all: Article[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}

async function fetchAllFeeds(): Promise<Article[]> {
  const feeds = [
    fetchFeed("https://asia.nikkei.com/rss/feed/nar", "Nikkei Asia", "https://asia.nikkei.com", "japan", 20),
    fetchFeed("https://www3.nhk.or.jp/rss/news/cat4.xml", "NHK World", "https://www3.nhk.or.jp/nhkworld/", "japan", 15),
    fetchFeed("https://www3.nhk.or.jp/rss/news/cat6.xml", "NHK World", "https://www3.nhk.or.jp/nhkworld/", "macro", 10),
    fetchFeed("https://www.japantimes.co.jp/feed/", "Japan Times", "https://www.japantimes.co.jp", "japan", 15),
    fetchFeed("https://feeds.reuters.com/reuters/businessNews", "Reuters", "https://www.reuters.com", "macro", 15),
    fetchFeed("https://feeds.marketwatch.com/marketwatch/topstories/", "MarketWatch", "https://www.marketwatch.com", "markets", 15),
    fetchFeed("https://seekingalpha.com/market_currents.xml", "Seeking Alpha", "https://seekingalpha.com", "markets", 12),
    fetchVoicesFeeds(),
  ];

  const results = await Promise.allSettled(feeds);
  const all: Article[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let cache: { articles: Article[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function fetchAllNews(force = false): Promise<Article[]> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.articles;
  }

  const all = await fetchAllFeeds();

  // Dedupe by id, recency bonus, sort by importance then date
  const seen = new Set<string>();
  const deduped = all.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Apply recency bonus: < 2h = +20 pts, < 6h = +10 pts
  const now = Date.now();
  for (const a of deduped) {
    const ageH = (now - a.publishedMs) / (1000 * 60 * 60);
    let bonus = 0;
    if (ageH < 2) bonus = 20;
    else if (ageH < 6) bonus = 10;
    else if (ageH < 12) bonus = 5;
    a.importanceScore = Math.min(100, a.importanceScore + bonus);
    a.importance = a.importanceScore >= 60 ? "high" : a.importanceScore >= 30 ? "medium" : "low";
  }

  // Sort: High first → within same tier, newest first
  deduped.sort((a, b) => {
    const tierA = a.importance === "high" ? 2 : a.importance === "medium" ? 1 : 0;
    const tierB = b.importance === "high" ? 2 : b.importance === "medium" ? 1 : 0;
    if (tierA !== tierB) return tierB - tierA;
    return b.publishedMs - a.publishedMs;
  });

  cache = { articles: deduped, fetchedAt: Date.now() };
  return deduped;
}

export function filterByTicker(articles: Article[], ticker: string): Article[] {
  const upper = ticker.toUpperCase();
  return articles.filter(a =>
    a.tags.includes(upper) ||
    a.title.toUpperCase().includes(upper) ||
    (TICKER_KEYWORDS[upper] || []).some(kw => a.title.toLowerCase().includes(kw))
  );
}
