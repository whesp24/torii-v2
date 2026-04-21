import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";
import {
  holdings, briefings, settings, pushSubscriptions, tasks, voiceHandles,
} from "@shared/schema";
import type {
  Holding, InsertHolding, Briefing, Task, InsertTask, VoiceHandle,
} from "@shared/schema";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH  = path.join(DATA_DIR, "data.db");

const sqlite = new Database(DB_PATH);
const db     = drizzle(sqlite);

// ── Create tables ─────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    shares REAL NOT NULL,
    cost_basis REAL,
    display_name TEXT
  );
  CREATE TABLE IF NOT EXISTS briefings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    subscription TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    auto INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'low',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS voice_handles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT NOT NULL UNIQUE,
    display_name TEXT,
    added_at INTEGER NOT NULL
  );
`);

// ── Seed default holdings if empty ────────────────────────────────────────────
const existingHoldings = db.select().from(holdings).all();
if (existingHoldings.length === 0) {
  const defaults: InsertHolding[] = [
    { ticker: "ONDS",  shares: 100,  costBasis: null, displayName: "Ondas Holdings"     },
    { ticker: "MMS",   shares: 14,   costBasis: null, displayName: "Maximus Inc"         },
    { ticker: "MUFG",  shares: 60,   costBasis: null, displayName: "Mitsubishi UFJ"      },
    { ticker: "QXO",   shares: 31,   costBasis: null, displayName: "QXO Inc"             },
    { ticker: "TPL",   shares: 2,    costBasis: null, displayName: "Texas Pacific Land"  },
    { ticker: "CRCL",  shares: 16,   costBasis: null, displayName: "Circle Internet"     },
    { ticker: "VOO",   shares: 2,    costBasis: null, displayName: "Vanguard S&P 500"   },
    { ticker: "VRT",   shares: 2,    costBasis: null, displayName: "Vertiv Holdings"     },
    { ticker: "NVDA",  shares: 3,    costBasis: null, displayName: "NVIDIA"              },
    { ticker: "AMD",   shares: 1.09, costBasis: null, displayName: "AMD"                 },
    { ticker: "GOOGL", shares: 1,    costBasis: null, displayName: "Alphabet"            },
  ];
  for (const h of defaults) db.insert(holdings).values(h).run();
}

// ── Seed default voice handles if empty ───────────────────────────────────────
const existingHandles = db.select().from(voiceHandles).all();
if (existingHandles.length === 0) {
  const defaults = [
    { handle: "KevinLMak",       displayName: "Kevin Mak"       },
    { handle: "ContrarianCurse", displayName: "SuspendedCap"    },
    { handle: "dsundheim",       displayName: "D. Sundheim"      },
    { handle: "jeff_weinstein",  displayName: "Jeff Weinstein"   },
    { handle: "patrick_oshag",   displayName: "Patrick O'Shag"  },
    { handle: "HannoLustig",     displayName: "Hanno Lustig"    },
  ];
  for (const h of defaults) {
    db.insert(voiceHandles).values({ ...h, addedAt: Date.now() }).run();
  }
}

export const storage = {

  // ── Holdings ─────────────────────────────────────────────────────────────────
  getHoldings(): Holding[] {
    return db.select().from(holdings).all();
  },
  addHolding(h: InsertHolding): Holding {
    return db.insert(holdings).values(h).returning().get();
  },
  updateHolding(id: number, data: Partial<InsertHolding>): Holding | undefined {
    return db.update(holdings).set(data).where(eq(holdings.id, id)).returning().get();
  },
  deleteHolding(id: number): void {
    db.delete(holdings).where(eq(holdings.id, id)).run();
  },

  // ── Briefings ─────────────────────────────────────────────────────────────────
  getTodayBriefing(): Briefing | undefined {
    const today = new Date().toISOString().slice(0, 10);
    return db.select().from(briefings).all().find(b => b.date === today);
  },
  saveBriefing(date: string, content: string): Briefing {
    return db.insert(briefings).values({ date, content, generatedAt: Date.now() }).returning().get();
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  getSetting(key: string): string | undefined {
    return db.select().from(settings).all().find(s => s.key === key)?.value;
  },
  setSetting(key: string, value: string): void {
    sqlite.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  },

  // ── Push subscriptions ────────────────────────────────────────────────────────
  savePushSubscription(endpoint: string, sub: object): void {
    sqlite.prepare(
      "INSERT OR REPLACE INTO push_subscriptions (endpoint, subscription, created_at) VALUES (?, ?, ?)"
    ).run(endpoint, JSON.stringify(sub), Date.now());
  },
  getPushSubscriptions(): Array<{ endpoint: string; subscription: string }> {
    return db.select().from(pushSubscriptions).all();
  },
  removePushSubscription(endpoint: string): void {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  getTasks(): Task[] {
    return db.select().from(tasks).orderBy(asc(tasks.createdAt)).all();
  },
  addTask(text: string, auto = false, priority: "high" | "medium" | "low" = "low"): Task {
    return db.insert(tasks)
      .values({ text, done: false, auto, priority, createdAt: Date.now() })
      .returning().get();
  },
  updateTask(id: number, data: { done?: boolean; text?: string; priority?: string }): Task | undefined {
    return db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
  },
  deleteTask(id: number): void {
    db.delete(tasks).where(eq(tasks.id, id)).run();
  },

  // ── Voice handles ─────────────────────────────────────────────────────────────
  getVoiceHandles(): VoiceHandle[] {
    return db.select().from(voiceHandles).orderBy(asc(voiceHandles.addedAt)).all();
  },
  addVoiceHandle(handle: string, displayName?: string): VoiceHandle {
    return db.insert(voiceHandles)
      .values({ handle: handle.replace(/^@/, ""), displayName: displayName || null, addedAt: Date.now() })
      .returning().get();
  },
  removeVoiceHandle(handle: string): void {
    db.delete(voiceHandles)
      .where(eq(voiceHandles.handle, handle.replace(/^@/, "")))
      .run();
  },
};
