// ──────────────────────────────────────────────────────────────────────────────
// Voices API — /api/voices
//
// Wire up in server/index.ts (or routes.ts):
//
//   import { registerVoicesRoutes } from "./voices-routes";
//   registerVoicesRoutes(app);
//
// ──────────────────────────────────────────────────────────────────────────────

import type { Express } from "express";
import { getAllVoices, invalidateVoicesCache } from "./nitter-service";

export function registerVoicesRoutes(app: Express) {

  // Aggregated feed across all tracked handles
  app.get("/api/voices", async (_req, res) => {
    try {
      const { tweets, stale, failed } = await getAllVoices();
      res.json({
        tweets,
        meta: {
          count:      tweets.length,
          stale,                      // handles served from cache
          failed,                     // handles with no data
          source:     failed.length === 0 ? "live" : (tweets.length > 0 ? "partial" : "offline"),
          fetchedAt:  Date.now(),
        },
      });
    } catch (e: any) {
      console.error("[/api/voices] error", e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  // Force-refresh (bypasses cache)
  app.post("/api/voices/refresh", async (_req, res) => {
    invalidateVoicesCache();
    try {
      const data = await getAllVoices();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });
}
