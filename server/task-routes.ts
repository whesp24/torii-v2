import type { Express } from "express";
import { storage } from "./storage";

export function registerTaskRoutes(app: Express) {

  // ── Tasks ──────────────────────────────────────────────────────────────────

  app.get("/api/tasks", (_req, res) => {
    res.json(storage.getTasks());
  });

  app.post("/api/tasks", (req, res) => {
    const { text, priority } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text required" });
    res.json(storage.addTask(text.trim(), false, priority || "low"));
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateTask(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    storage.deleteTask(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ── Voice handles ──────────────────────────────────────────────────────────

  app.get("/api/voices/handles", (_req, res) => {
    res.json(storage.getVoiceHandles());
  });

  app.post("/api/voices/handles", (req, res) => {
    const { handle, displayName } = req.body;
    if (!handle?.trim()) return res.status(400).json({ error: "handle required" });
    try {
      const h = storage.addVoiceHandle(handle.trim(), displayName?.trim());
      res.json(h);
    } catch (e: any) {
      // SQLite unique constraint
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Handle already exists" });
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/voices/handles/:handle", (req, res) => {
    storage.removeVoiceHandle(req.params.handle);
    res.json({ ok: true });
  });
}
