import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { holdings, briefings, settings } from "@shared/schema";
import type { Holding, InsertHolding, Briefing } from "@shared/schema";
import { eq } from "drizzle-orm";
import path from "path";

// Use DATA_DIR env var (set in Railway/cloud) or fall back to process.cwd() locally
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, "data.db");

const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);

// Create tables
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
`);

// Seed default holdings if empty
const existing = db.select().from(holdings).all();
if (existing.length === 0) {
  const defaults: InsertHolding[] = [
    { ticker: "ONDS",  shares: 100,  costBasis: null, displayName: "Ondas Holdings" },
    { ticker: "MMS",   shares: 14,   costBasis: null, displayName: "Maximus Inc" },
    { ticker: "MUFG",  shares: 60,   costBasis: null, displayName: "Mitsubishi UFJ" },
    { ticker: "QXO",   shares: 31,   costBasis: null, displayName: "QXO Inc" },
    { ticker: "TPL",   shares: 2,    costBasis: null, displayName: "Texas Pacific Land" },
    { ticker: "CRCL",  shares: 16,   costBasis: null, displayName: "Circle Internet" },
    { ticker: "VOO",   shares: 2,    costBasis: null, displayName: "Vanguard S&P 500" },
    { ticker: "VRT",   shares: 2,    costBasis: null, displayName: "Vertiv Holdings" },
    { ticker: "NVDA",  shares: 3,    costBasis: null, displayName: "NVIDIA" },
    { ticker: "AMD",   shares: 1.09, costBasis: null, displayName: "AMD" },
    { ticker: "GOOGL", shares: 1,    costBasis: null, displayName: "Alphabet" },
  ];
  for (const h of defaults) {
    db.insert(holdings).values(h).run();
  }
}

export interface IStorage {
  // Holdings
  getHoldings(): Holding[];
  addHolding(h: InsertHolding): Holding;
  updateHolding(id: number, data: Partial<InsertHolding>): Holding | undefined;
  deleteHolding(id: number): void;
  // Briefings
  getTodayBriefing(): Briefing | undefined;
  saveBriefing(date: string, content: string): Briefing;
  // Settings
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
}

export const storage: IStorage = {
  getHoldings() {
    return db.select().from(holdings).all();
  },
  addHolding(h) {
    return db.insert(holdings).values(h).returning().get();
  },
  updateHolding(id, data) {
    return db.update(holdings).set(data).where(eq(holdings.id, id)).returning().get();
  },
  deleteHolding(id) {
    db.delete(holdings).where(eq(holdings.id, id)).run();
  },
  getTodayBriefing() {
    const today = new Date().toISOString().slice(0, 10);
    return db.select().from(briefings).all().find(b => b.date === today);
  },
  saveBriefing(date, content) {
    return db.insert(briefings).values({ date, content, generatedAt: Date.now() }).returning().get();
  },
  getSetting(key) {
    return db.select().from(settings).all().find(s => s.key === key)?.value;
  },
  setSetting(key, value) {
    sqlite.exec(`INSERT OR REPLACE INTO settings (key, value) VALUES ('${key.replace(/'/g,"''")}', '${value.replace(/'/g,"''")}');`);
  },
};
