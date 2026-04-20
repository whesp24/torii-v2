import { execSync } from "child_process";

function curlJson(url: string): any {
  try {
    const cmd = `curl -s --max-time 15 -H "User-Agent: Mozilla/5.0" -H "Accept: application/json" "${url}"`;
    return JSON.parse(execSync(cmd, { encoding: "utf-8", timeout: 17000 }));
  } catch { return null; }
}

// Box-Muller normal random
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pct(arr: number[], p: number): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor((p / 100) * (s.length - 1))];
}

// ── Technical Indicators ──────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const gains: number[] = [], losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  // Use only last `period` values for initial avg
  const recentGains = gains.slice(-period);
  const recentLosses = losses.slice(-period);
  const avgGain = recentGains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = recentLosses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    emas.push(closes[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine.slice(12), 9);
  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return { macd: lastMACD, signal: lastSignal, histogram: lastMACD - lastSignal };
}

function calcBollingerBands(closes: number[], period = 20, mult = 2): { upper: number; mid: number; lower: number; pctB: number; bandwidth: number } {
  const window = closes.slice(-period);
  if (window.length < period) return { upper: closes[closes.length-1], mid: closes[closes.length-1], lower: closes[closes.length-1], pctB: 0.5, bandwidth: 0 };
  const mid = window.reduce((a, b) => a + b, 0) / period;
  const variance = window.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = mid + mult * std;
  const lower = mid - mult * std;
  const current = closes[closes.length - 1];
  const pctB = std > 0 ? (current - lower) / (upper - lower) : 0.5;
  const bandwidth = std > 0 ? (upper - lower) / mid : 0;
  return { upper, mid, lower, pctB, bandwidth };
}

function calcSMA(closes: number[], period: number): number {
  const w = closes.slice(-period);
  return w.reduce((a, b) => a + b, 0) / w.length;
}

// ── Regime detection: trending vs ranging ────────────────────────────────────

function detectRegime(closes: number[]): { trend: "up" | "down" | "neutral"; strength: number } {
  if (closes.length < 20) return { trend: "neutral", strength: 0 };
  const sma20 = calcSMA(closes, 20);
  const sma50 = closes.length >= 50 ? calcSMA(closes, 50) : sma20;
  const current = closes[closes.length - 1];
  const priceVsSma20 = (current - sma20) / sma20;
  const sma20VsSma50 = (sma20 - sma50) / sma50;
  const strength = Math.abs(priceVsSma20) + Math.abs(sma20VsSma50);
  if (priceVsSma20 > 0 && sma20VsSma50 >= 0) return { trend: "up", strength };
  if (priceVsSma20 < 0 && sma20VsSma50 <= 0) return { trend: "down", strength };
  return { trend: "neutral", strength };
}

// ── Volatility regime: GARCH-lite (rolling variance adaptation) ───────────────

function calcConditionalVol(logReturns: number[]): number {
  // Exponentially-weighted variance (EWMA, lambda=0.94 — RiskMetrics standard)
  const lambda = 0.94;
  let variance = logReturns.slice(0, 5).reduce((s, r) => s + r * r, 0) / 5;
  for (const r of logReturns.slice(5)) {
    variance = lambda * variance + (1 - lambda) * r * r;
  }
  return Math.sqrt(variance); // daily conditional vol
}

export interface TechnicalSignals {
  rsi: number;
  rsiLabel: string;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  macdBullish: boolean;
  bbUpper: number;
  bbMid: number;
  bbLower: number;
  bbPctB: number;
  bbBandwidth: number;
  sma20: number;
  sma50: number;
  trend: "up" | "down" | "neutral";
  trendStrength: number;
  overallSignal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  signalScore: number; // -100 to +100
}

export interface OutlookResult {
  symbol: string;
  currentPrice: number;
  annualizedVol: number;
  conditionalVol: number;
  annualizedReturn: number;
  sentimentScore: number;
  sentimentLabel: string;
  technicals: TechnicalSignals;
  horizons: {
    label: string; days: number;
    p5: number; p15: number; p25: number; p50: number; p75: number; p85: number; p95: number;
    probAbove: number; probBelow: number; expectedReturn: number;
  }[];
  cone: { day: number; p5: number; p15: number; p25: number; p50: number; p75: number; p85: number; p95: number }[];
  scenarios: { label: string; color: string; days: number[]; prices: number[] }[];
  distribution: { bucket: string; from: number; to: number; count: number; pct: number }[];
  keyLevels: { label: string; price: number; type: "support" | "resistance" }[];
  dataPoints: number;
  simulations: number;
  modelNotes: string[];
}

export function computeOutlook(symbol: string, simCount = 2000): OutlookResult | null {
  // Fetch 6 months of daily data for better statistical estimates
  const enc = encodeURIComponent(symbol);
  const data = curlJson(`https://query1.finance.yahoo.com/v8/finance/chart/${enc}?range=6mo&interval=1d`);
  const rawCloses: number[] = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
    .filter((v: any) => v !== null && !isNaN(v));
  if (rawCloses.length < 15) return null;

  const closes = rawCloses;
  const currentPrice = closes[closes.length - 1];
  const logReturns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
  const n = logReturns.length;

  // Historical stats
  const meanReturn = logReturns.reduce((s, r) => s + r, 0) / n;
  const variance = logReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (n - 1);
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252);
  const annualizedReturn = meanReturn * 252;

  // EWMA conditional volatility (more responsive to recent regime)
  const condDailyVol = calcConditionalVol(logReturns);
  const blendedVol = 0.6 * condDailyVol + 0.4 * dailyVol; // blend historical + conditional

  // ── Technicals ──────────────────────────────────────────────────────────────
  const rsi = calcRSI(closes);
  const rsiLabel = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : rsi >= 60 ? "Bullish" : rsi <= 40 ? "Bearish" : "Neutral";
  const { macd, signal: macdSignal, histogram: macdHistogram } = calcMACD(closes);
  const { upper: bbUpper, mid: bbMid, lower: bbLower, pctB: bbPctB, bandwidth: bbBandwidth } = calcBollingerBands(closes);
  const sma20 = calcSMA(closes, 20);
  const sma50 = closes.length >= 50 ? calcSMA(closes, 50) : sma20;
  const { trend, strength: trendStrength } = detectRegime(closes);

  // Composite signal score (-100 to +100)
  let signalScore = 0;
  // RSI contribution (±30)
  if (rsi < 30) signalScore += 30;         // oversold = bullish
  else if (rsi > 70) signalScore -= 30;    // overbought = bearish
  else signalScore += (50 - rsi) * 0.6;   // scaled

  // MACD contribution (±20)
  if (macdHistogram > 0) signalScore += 20;
  else signalScore -= 20;

  // Trend contribution (±30)
  if (trend === "up") signalScore += Math.min(30, trendStrength * 200);
  else if (trend === "down") signalScore -= Math.min(30, trendStrength * 200);

  // BB contribution (±20): price near lower band = bullish
  signalScore += (0.5 - bbPctB) * 40;

  const overallSignal: TechnicalSignals["overallSignal"] =
    signalScore >= 50 ? "Strong Buy" :
    signalScore >= 20 ? "Buy" :
    signalScore <= -50 ? "Strong Sell" :
    signalScore <= -20 ? "Sell" : "Neutral";

  const technicals: TechnicalSignals = {
    rsi: +rsi.toFixed(1), rsiLabel,
    macd: +macd.toFixed(4), macdSignal: +macdSignal.toFixed(4), macdHistogram: +macdHistogram.toFixed(4),
    macdBullish: macdHistogram > 0,
    bbUpper: +bbUpper.toFixed(2), bbMid: +bbMid.toFixed(2), bbLower: +bbLower.toFixed(2),
    bbPctB: +bbPctB.toFixed(3), bbBandwidth: +bbBandwidth.toFixed(3),
    sma20: +sma20.toFixed(2), sma50: +sma50.toFixed(2),
    trend, trendStrength: +trendStrength.toFixed(4),
    overallSignal, signalScore: +signalScore.toFixed(1),
  };

  // ── Sentiment ────────────────────────────────────────────────────────────────
  const sentData = curlJson("https://api.alternative.me/fng/?limit=7");
  const sentScore = parseInt(sentData?.data?.[0]?.value ?? "50") / 100;
  const sentimentLabel = sentScore >= 0.75 ? "Extreme Greed" : sentScore >= 0.55 ? "Greed" : sentScore >= 0.45 ? "Neutral" : sentScore >= 0.25 ? "Fear" : "Extreme Fear";

  // Sentiment delta: adjusts drift proportional to market sentiment vs neutral
  const sentDelta = (sentScore - 0.5) * 0.3 * annualizedVol;

  // Technical drift adjustment: incorporate signal score
  const techDelta = (signalScore / 100) * 0.15 * annualizedVol;

  // Combined drift
  const adjAnnualReturn = annualizedReturn + sentDelta + techDelta;
  const dailyDrift = adjAnnualReturn / 252;

  // ── Monte Carlo GBM with blended vol ─────────────────────────────────────────
  const T = 90;
  const paths: number[][] = [];
  for (let s = 0; s < simCount; s++) {
    const path = [currentPrice];
    for (let d = 1; d <= T; d++) {
      // Use blended vol for simulation
      const shock = dailyDrift - 0.5 * blendedVol ** 2 + blendedVol * randn();
      path.push(path[d - 1] * Math.exp(shock));
    }
    paths.push(path);
  }

  // ── Cone ────────────────────────────────────────────────────────────────────
  const cone = [];
  for (let d = 0; d <= T; d += 5) {
    const slice = paths.map(p => p[d]);
    cone.push({ day: d, p5: pct(slice,5), p15: pct(slice,15), p25: pct(slice,25), p50: pct(slice,50), p75: pct(slice,75), p85: pct(slice,85), p95: pct(slice,95) });
  }

  // ── Horizons ─────────────────────────────────────────────────────────────────
  const horizons = [
    { label: "1 Week", days: 5 },
    { label: "2 Weeks", days: 10 },
    { label: "1 Month", days: 21 },
    { label: "3 Months", days: 63 },
  ].map(({ label, days }) => {
    const slice = paths.map(p => p[Math.min(days, p.length - 1)]);
    const above = slice.filter(v => v > currentPrice).length;
    const medianVal = pct(slice, 50);
    const expectedReturn = ((medianVal - currentPrice) / currentPrice) * 100;
    return {
      label, days,
      p5: pct(slice,5), p15: pct(slice,15), p25: pct(slice,25), p50: medianVal, p75: pct(slice,75), p85: pct(slice,85), p95: pct(slice,95),
      probAbove: +(above / simCount * 100).toFixed(1),
      probBelow: +((simCount - above) / simCount * 100).toFixed(1),
      expectedReturn: +expectedReturn.toFixed(1),
    };
  });

  // ── Scenarios ─────────────────────────────────────────────────────────────────
  const endVals = paths.map((p, i) => ({ i, val: p[T] })).sort((a, b) => a.val - b.val);
  const days = Array.from({ length: T + 1 }, (_, i) => i);
  const scenarios = [
    { label: "Bear (10th)", color: "#ef4444", days, prices: paths[endVals[Math.floor(0.10 * simCount)].i] },
    { label: "Base (50th)", color: "#d4a94c", days, prices: paths[endVals[Math.floor(0.50 * simCount)].i] },
    { label: "Bull (90th)", color: "#22c55e", days, prices: paths[endVals[Math.floor(0.90 * simCount)].i] },
  ];

  // ── Return distribution (1 month horizon) ────────────────────────────────────
  const oneM = paths.map(p => p[21]);
  const returns1M = oneM.map(v => ((v - currentPrice) / currentPrice) * 100);
  const minR = Math.min(...returns1M), maxR = Math.max(...returns1M);
  const bucketCount = 24, bucketSize = (maxR - minR) / bucketCount;
  const distribution = Array.from({ length: bucketCount }, (_, i) => {
    const from = minR + i * bucketSize, to = from + bucketSize;
    const count = returns1M.filter(r => r >= from && (i === bucketCount - 1 ? r <= to : r < to)).length;
    return { bucket: `${from >= 0 ? "+" : ""}${from.toFixed(1)}%`, from: +from.toFixed(2), to: +to.toFixed(2), count, pct: +((count / simCount) * 100).toFixed(1) };
  });

  // ── Key price levels ─────────────────────────────────────────────────────────
  const keyLevels: OutlookResult["keyLevels"] = [];
  keyLevels.push({ label: "BB Upper", price: +bbUpper.toFixed(2), type: "resistance" });
  keyLevels.push({ label: "BB Mid (20 SMA)", price: +bbMid.toFixed(2), type: currentPrice > bbMid ? "support" : "resistance" });
  keyLevels.push({ label: "BB Lower", price: +bbLower.toFixed(2), type: "support" });
  if (closes.length >= 50) keyLevels.push({ label: "50-Day SMA", price: +sma50.toFixed(2), type: currentPrice > sma50 ? "support" : "resistance" });
  // 52-week high/low from chart meta
  const meta = data?.chart?.result?.[0]?.meta;
  if (meta?.fiftyTwoWeekHigh) keyLevels.push({ label: "52W High", price: +meta.fiftyTwoWeekHigh.toFixed(2), type: "resistance" });
  if (meta?.fiftyTwoWeekLow) keyLevels.push({ label: "52W Low", price: +meta.fiftyTwoWeekLow.toFixed(2), type: "support" });
  keyLevels.sort((a, b) => b.price - a.price);

  // ── Model notes ──────────────────────────────────────────────────────────────
  const modelNotes = [
    `${simCount.toLocaleString()} Monte Carlo paths (GBM + EWMA vol blending)`,
    `Historical vol: ${(annualizedVol * 100).toFixed(1)}% | Conditional vol: ${(condDailyVol * Math.sqrt(252) * 100).toFixed(1)}%`,
    `Drift adjusted for sentiment (${sentimentLabel}) + technicals (${overallSignal})`,
    `RSI ${rsi.toFixed(0)} · MACD ${macdHistogram >= 0 ? "bullish" : "bearish"} · Trend: ${trend} · BB %B: ${(bbPctB * 100).toFixed(0)}%`,
    `Based on ${closes.length} trading days of price history`,
  ];

  return {
    symbol, currentPrice,
    annualizedVol: +(annualizedVol * 100).toFixed(1),
    conditionalVol: +(condDailyVol * Math.sqrt(252) * 100).toFixed(1),
    annualizedReturn: +(annualizedReturn * 100).toFixed(1),
    sentimentScore: sentScore,
    sentimentLabel,
    technicals,
    horizons, cone, scenarios, distribution, keyLevels,
    dataPoints: closes.length,
    simulations: simCount,
    modelNotes,
  };
}
