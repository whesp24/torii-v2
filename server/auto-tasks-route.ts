// ──────────────────────────────────────────────────────────────────────────────
// Auto-tasks endpoint
//
// Wire up in server/index.ts:
//
//   import { registerAutoTasksRoute } from "./auto-tasks-route";
//   registerAutoTasksRoute(app);
//
// Replace the `buildSnapshot()` stub below with calls to your existing quote /
// FX / news services. Everything else just works.
// ──────────────────────────────────────────────────────────────────────────────

import type { Express } from "express";
import { syncAutoTasks, type MarketSnapshot } from "./auto-tasks";

// ─── TODO: replace with your real services ────────────────────────────────────
async function buildSnapshot(): Promise<MarketSnapshot> {
  // Examples — rewire these to your actual providers:
  //   const quotes   = await quoteService.getAll();
  //   const fx       = await fxService.get(["USDJPY"]);
  //   const indices  = await indexService.get(["N225"]);
  //   const vix      = await quoteService.getOne("VIX");
  //   const earnings = await earningsService.upcoming(7);
  //   const news     = await newsService.latest(20);
  //
  // Shape them into MarketSnapshot and return.
  return {
    quotes:   [],
    fx:       [],
    indices:  [],
    vix:      { last: 0, changePct: 0 },
    earnings: [],
    news:     [],
  };
}
// ──────────────────────────────────────────────────────────────────────────────

export function registerAutoTasksRoute(app: Express) {

  // Regenerates auto-tasks against a fresh snapshot and returns the full task list
  // (auto + manual) with [key] markers stripped.
  app.post("/api/tasks/sync-auto", async (_req, res) => {
    try {
      const snap  = await buildSnapshot();
      const tasks = syncAutoTasks(snap);
      res.json({ tasks, at: Date.now() });
    } catch (e: any) {
      console.error("[/api/tasks/sync-auto]", e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });
}
