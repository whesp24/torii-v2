# TORII — Japan Market Research Hub

Dark-terminal research dashboard: Japan equities, macro data, portfolio tracking, AI briefings, and advanced stock prediction.

---

## Quick Start (Terminal)

```bash
cd ~/Downloads/torii-v2
PORT=3000 npm run dev
```

Then open: **http://localhost:3000**

---

## One-Click Mac App (No Terminal)

Run this **once** to create a dock-launchable app:

```bash
cd ~/Downloads/torii-v2
bash make-mac-app.sh
```

This creates `~/Applications/Torii.app`. Drag it to your Dock — double-click to launch anytime. No Terminal needed. First launch takes ~10 seconds; subsequent ones are instant.

---

## Features

### Overview
- AI daily briefing (uses Perplexity or OpenAI API if configured)
- Nikkei 225 live chart
- Portfolio snapshot with total value + movers
- Top headlines

### My Portfolio
- Live prices, day change, 52-week range
- Holdings allocation chart
- Add/remove holdings
- Click any ticker → full detail view

### Stock Detail
- Price chart with volume (5D / 1M / 3M / 6M / 1Y)
- **Price Outlook tab:** Monte Carlo simulation (2,000 paths), probability cones, horizon cards (1W/2W/1M/3M), return distribution histogram
- **Technicals tab:** RSI, MACD, Bollinger Bands %B, SMA20/50, trend regime, composite signal score, key price levels
- **News tab:** articles filtered to that stock

### Japan Market
- Nikkei 225, TOPIX, USD/JPY, ETFs (EWJ, DXJ, SCJ, DBJP)
- Japanese equities: Toyota, Honda, Nintendo, Sony, NTT, MUFG
- Macro: VIX, Gold, Oil, 10Y/5Y yields, S&P 500, Dow, NASDAQ, Bitcoin

### News Feed
- Live articles from 6 sources (Nikkei Asia, NHK, Japan Times, Reuters, MarketWatch, Seeking Alpha)
- **Importance filter:** High / Medium / Low — scored by portfolio relevance, market-moving keywords, recency
- Category filter: Japan / Markets / Macro
- Full-text search

---

## Stock Prediction Model

The Price Outlook uses a multi-factor Monte Carlo simulation:

- **2,000 GBM paths** over 90 trading days
- **EWMA volatility** (RiskMetrics lambda=0.94) blended with historical vol — more responsive to recent price regimes
- **Drift adjusted** for:
  - Historical log returns (6 months of data)
  - Fear & Greed Index (sentiment delta)
  - RSI, MACD, Bollinger Bands, trend regime (technical delta)
- **Output:** probability cones (p5–p95), upside probability per horizon, expected return, key price levels, model notes

---

## API Keys (Optional but recommended)

For AI briefings, add your key to `.env` in the project root:

```
PERPLEXITY_API_KEY=pplx-...
# or
OPENAI_API_KEY=sk-...
```

Without keys, the briefing falls back to a rule-based compose from live data.

---

## Data Sources

| Source | Data |
|--------|------|
| Yahoo Finance v8 | Prices, charts, fundamentals |
| Fear & Greed API | Market sentiment (0–100) |
| Nikkei Asia RSS | Japan business news |
| NHK World RSS | Japan economy & international |
| Japan Times RSS | Japan news |
| Reuters RSS | Global macro |
| MarketWatch RSS | US markets |
| Seeking Alpha RSS | Stock analysis |

---

## Technical Notes

- **Node v24 on macOS:** Use `PORT=3000 npm run dev` (avoids `reusePort` ENOTSUP on port 5000)
- **Database:** SQLite (`data.db` in project root) — created automatically on first run
- **Cache:** Quotes = 60s, News = 10min, Briefing = daily, Charts = 5min
- **Yahoo Finance:** Uses parallel curl batches (not node-fetch which gets 429)
