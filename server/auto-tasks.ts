// ──────────────────────────────────────────────────────────────────────────────
// Auto-task generator
//
// Synthesises a list of "watch items" from live portfolio + market + news data.
// Matches the logic that was running client-side in the mockup — moved to the
// server so the same tasks show up on every device.
//
// Rules:
//   • Any holding moving ±4% today → task (≥7% = high priority)
//   • USD/JPY ≥ 159   → "BOJ intervention watch"
//   • VIX  ≥ 22 or +5% today → "Review hedges"
//   • Nikkei within 0.5% of 52w high → "Reassess JP exposure"
//   • Any earnings within 3 days for a held ticker → "<TICKER> earnings <N>d"
//   • Top 2 high-importance news items → "Read: <headline>"
//
// Each auto-task has a stable `key` derived from its rule so we don't
// double-create them on every call.
// ──────────────────────────────────────────────────────────────────────────────

import { storage } from "./storage";
import type { Task } from "@shared/schema";

// ── Types you'll need to wire from your existing services ─────────────────────
interface Quote   { ticker: string; price: number; changePct: number; }
interface FxPoint { pair: string;   rate:  number; changePct: number; }
interface Index   { symbol: string; last:  number; pct52wHigh: number; }  // 0..1
interface Earning { ticker: string; date:  string; /* YYYY-MM-DD */ }
interface News    { id: string; headline: string; importance: number; /* 0..10 */ }

export interface MarketSnapshot {
  quotes:   Quote[];
  fx:       FxPoint[];      // expect at least USDJPY
  indices:  Index[];        // expect at least N225
  vix:      { last: number; changePct: number };
  earnings: Earning[];
  news:     News[];
}

// ── Generator ─────────────────────────────────────────────────────────────────

interface AutoSpec {
  key:      string;                        // stable identifier for this rule firing
  text:     string;
  priority: "high" | "medium" | "low";
}

export function generateAutoTaskSpecs(snap: MarketSnapshot): AutoSpec[] {
  const out: AutoSpec[] = [];
  const held = new Set(storage.getHoldings().map(h => h.ticker));

  // 1. Portfolio movers
  for (const q of snap.quotes) {
    if (!held.has(q.ticker)) continue;
    const abs = Math.abs(q.changePct);
    if (abs < 4) continue;
    const dir = q.changePct < 0 ? "down" : "up";
    out.push({
      key:      `mover:${q.ticker}:${new Date().toISOString().slice(0,10)}`,
      text:     `${q.ticker} ${dir} ${abs.toFixed(1)}% today`,
      priority: abs >= 7 ? "high" : "medium",
    });
  }

  // 2. USD/JPY BOJ watch
  const usdjpy = snap.fx.find(f => f.pair === "USDJPY");
  if (usdjpy && usdjpy.rate >= 159) {
    out.push({
      key:      `fx:usdjpy-boj:${Math.floor(usdjpy.rate)}`,
      text:     `USD/JPY at ${usdjpy.rate.toFixed(2)} — BOJ intervention watch`,
      priority: usdjpy.rate >= 161 ? "high" : "medium",
    });
  }

  // 3. VIX
  if (snap.vix.last >= 22 || snap.vix.changePct >= 5) {
    out.push({
      key:      `vix:${snap.vix.last.toFixed(0)}`,
      text:     `VIX at ${snap.vix.last.toFixed(1)} (${snap.vix.changePct >= 0 ? "+" : ""}${snap.vix.changePct.toFixed(1)}%) — review hedges`,
      priority: snap.vix.last >= 28 ? "high" : "medium",
    });
  }

  // 4. Nikkei near 52w high
  const n225 = snap.indices.find(i => i.symbol === "N225");
  if (n225 && n225.pct52wHigh >= 0.995) {
    out.push({
      key:      `idx:n225-high`,
      text:     `Nikkei within 0.5% of 52w high — reassess JP exposure`,
      priority: "medium",
    });
  }

  // 5. Earnings-soon for held tickers
  const now = Date.now();
  for (const e of snap.earnings) {
    if (!held.has(e.ticker)) continue;
    const days = Math.round((new Date(e.date).getTime() - now) / 86_400_000);
    if (days < 0 || days > 3) continue;
    out.push({
      key:      `earn:${e.ticker}:${e.date}`,
      text:     `${e.ticker} earnings in ${days}d`,
      priority: days <= 1 ? "high" : "medium",
    });
  }

  // 6. Top news
  const topNews = [...snap.news].sort((a, b) => b.importance - a.importance).slice(0, 2);
  for (const n of topNews) {
    if (n.importance < 7) continue;
    out.push({
      key:      `news:${n.id}`,
      text:     `Read: ${n.headline}`,
      priority: n.importance >= 9 ? "high" : "low",
    });
  }

  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sync step — reconcile the generated specs against the DB.
//
// Strategy: auto-tasks are stored like manual ones but with auto=1 and the
// rule key prepended to the text as a hidden marker:  "[key] <text>".
// We read all current auto-tasks, diff against fresh specs, and:
//   • insert new specs
//   • keep existing auto-tasks (including their done state)
//   • delete auto-tasks whose rule no longer fires (and isn't done)
// This way a user can check off "CRCL down 9.7%" and it stays checked until
// the rule stops firing at end of day.
// ──────────────────────────────────────────────────────────────────────────────

const MARKER = /^\[([^\]]+)\]\s/;

export function syncAutoTasks(snap: MarketSnapshot): Task[] {
  const specs = generateAutoTaskSpecs(snap);
  const specsByKey = new Map(specs.map(s => [s.key, s]));

  const existing = storage.getTasks().filter(t => t.auto);
  const existingByKey = new Map<string, Task>();
  for (const t of existing) {
    const m = t.text.match(MARKER);
    if (m) existingByKey.set(m[1], t);
  }

  // Insert new
  for (const spec of specs) {
    if (existingByKey.has(spec.key)) continue;
    storage.addTask(`[${spec.key}] ${spec.text}`, true, spec.priority);
  }

  // Delete stale (not-done) auto-tasks whose rule stopped firing
  for (const [key, task] of existingByKey) {
    if (!specsByKey.has(key) && !task.done) {
      storage.deleteTask(task.id);
    }
  }

  // Return fresh list — strip the [key] marker for client display
  return storage.getTasks().map(t =>
    t.auto ? { ...t, text: t.text.replace(MARKER, "") } : t
  );
}
