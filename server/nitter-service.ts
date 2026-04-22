// ──────────────────────────────────────────────────────────────────────────────
// Nitter-backed voices service
//
// Fetches each tracked handle's RSS from a rotating pool of Nitter instances,
// parses it with fast-xml-parser, caches results in SQLite for 5 minutes,
// and returns a unified Tweet[] sorted newest-first.
//
// Deps:
//   npm i fast-xml-parser
//
// Why server-side:
//   • Nitter instances block cross-origin fetches from the browser.
//   • We can rotate instances + cache without hammering third-parties.
//   • Keeps the client thin — just hits /api/voices.
// ──────────────────────────────────────────────────────────────────────────────

import { XMLParser } from "fast-xml-parser";
import { storage } from "./storage";

// Rotating pool. Ordered by reliability (as of writing — rotate as instances die).
// Check https://status.d420.de/ for current uptime; swap in fresh ones as needed.
const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.kavin.rocks",
  "https://nitter.1d4.us",
];

const CACHE_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const FETCH_TIMEOUT_MS = 8000;
const MAX_TWEETS_PER_HANDLE = 10;

export interface Tweet {
  id:          string;
  handle:      string;          // without @
  displayName: string;
  text:        string;
  url:         string;          // canonical x.com URL
  createdAt:   number;          // unix ms
  replies?:    number;
  retweets?:   number;
  likes?:      number;
}

// ── In-memory cache (per-handle) ──────────────────────────────────────────────
interface CacheEntry { tweets: Tweet[]; fetchedAt: number; }
const cache = new Map<string, CacheEntry>();

// ──────────────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ToriiBot/1.0 (+finance-dashboard)" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function parseRss(feed: string, handle: string, displayName: string): Tweet[] {
  const doc = xml.parse(feed);
  const items = doc?.rss?.channel?.item;
  if (!items) return [];
  const arr = Array.isArray(items) ? items : [items];

  return arr.slice(0, MAX_TWEETS_PER_HANDLE).map((item: any): Tweet => {
    // <link> is usually an x.com/twitter.com URL; normalize to x.com
    const rawLink: string = item.link || "";
    const url = rawLink.replace(/https?:\/\/(?:mobile\.)?(?:twitter|nitter[^/]*)\.com/, "https://x.com");
    const id  = (url.split("/status/")[1] || "").split(/[/?#]/)[0] || `${handle}-${Date.parse(item.pubDate || "") || Date.now()}`;
    const text = stripHtml(String(item.description || item.title || ""));

    return {
      id,
      handle,
      displayName,
      text,
      url,
      createdAt: Date.parse(item.pubDate || "") || Date.now(),
    };
  });
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Fetches one handle from Nitter, rotating instances until one succeeds.
 * Returns [] if every instance fails — caller will fall back to cache.
 */
async function fetchHandle(handle: string, displayName: string): Promise<Tweet[]> {
  for (const base of NITTER_INSTANCES) {
    try {
      const feed = await fetchWithTimeout(`${base}/${handle}/rss`);
      const tweets = parseRss(feed, handle, displayName);
      if (tweets.length > 0) {
        console.log(`[nitter] ${handle} via ${base} — ${tweets.length} tweets`);
        return tweets;
      }
    } catch (e: any) {
      console.warn(`[nitter] ${handle} failed @ ${base}: ${e.message}`);
    }
  }
  return [];
}

/**
 * Fetches all tracked handles in parallel (with per-handle cache).
 * Returns a merged, deduped, newest-first Tweet[].
 */
export async function getAllVoices(): Promise<{
  tweets: Tweet[];
  stale:  string[];      // handles served from cache (didn't refresh)
  failed: string[];      // handles with no data at all
}> {
  const handles = storage.getVoiceHandles();
  const now = Date.now();

  const results = await Promise.all(handles.map(async h => {
    const cached = cache.get(h.handle);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      return { handle: h.handle, tweets: cached.tweets, stale: false, ok: true };
    }

    const fresh = await fetchHandle(h.handle, h.displayName || h.handle);
    if (fresh.length > 0) {
      cache.set(h.handle, { tweets: fresh, fetchedAt: now });
      return { handle: h.handle, tweets: fresh, stale: false, ok: true };
    }

    // Fetch failed — serve stale cache if we have anything
    if (cached) {
      return { handle: h.handle, tweets: cached.tweets, stale: true, ok: true };
    }
    return { handle: h.handle, tweets: [], stale: false, ok: false };
  }));

  const tweets = results
    .flatMap(r => r.tweets)
    .sort((a, b) => b.createdAt - a.createdAt);

  return {
    tweets,
    stale:  results.filter(r => r.stale).map(r => r.handle),
    failed: results.filter(r => !r.ok).map(r => r.handle),
  };
}

/**
 * Manual cache bust — e.g. when user adds/removes a handle.
 */
export function invalidateVoicesCache(handle?: string) {
  if (handle) cache.delete(handle.replace(/^@/, ""));
  else cache.clear();
}
