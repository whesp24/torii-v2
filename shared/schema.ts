import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Portfolio holdings ────────────────────────────────────────────────────────
export const holdings = sqliteTable("holdings", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  ticker:      text("ticker").notNull(),
  shares:      real("shares").notNull(),
  costBasis:   real("cost_basis"),      // per-share cost basis (optional)
  displayName: text("display_name"),
});

export const insertHoldingSchema = createInsertSchema(holdings).omit({ id: true });
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Holding = typeof holdings.$inferSelect;

// ── Cached AI briefing ────────────────────────────────────────────────────────
export const briefings = sqliteTable("briefings", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  date:        text("date").notNull(),            // YYYY-MM-DD
  content:     text("content").notNull(),
  generatedAt: integer("generated_at").notNull(), // unix ms
});

export type Briefing = typeof briefings.$inferSelect;

// ── Settings ──────────────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
});

// ── Web Push subscriptions ────────────────────────────────────────────────────
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint:     text("endpoint").primaryKey(),
  subscription: text("subscription").notNull(), // JSON PushSubscription
  createdAt:    integer("created_at").notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id:        integer("id").primaryKey({ autoIncrement: true }),
  text:      text("text").notNull(),
  done:      integer("done",      { mode: "boolean" }).notNull().default(false),
  auto:      integer("auto",      { mode: "boolean" }).notNull().default(false),
  priority:  text("priority").notNull().default("low"),  // "high" | "medium" | "low"
  createdAt: integer("created_at").notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ── Voice handles ─────────────────────────────────────────────────────────────
export const voiceHandles = sqliteTable("voice_handles", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  handle:      text("handle").notNull().unique(),  // Twitter handle, no @
  displayName: text("display_name"),               // optional friendly name
  addedAt:     integer("added_at").notNull(),
});

export type VoiceHandle = typeof voiceHandles.$inferSelect;
