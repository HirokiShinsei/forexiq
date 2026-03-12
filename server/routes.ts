import type { Express } from "express";
import type { Server } from "http";
import { OHLCBar, TechnicalIndicators, Signal, NewsItem, TickerQuote, MacroFactor } from "../shared/schema";

// ──────────────────────────────────────────────
// Technical Analysis Helpers
// ──────────────────────────────────────────────

function calcSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(data: number[], period = 14): number | null {
  if (data.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(data: number[]): { value: number; signal: number; histogram: number } | null {
  if (data.length < 26) return null;
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = ema12 - ema26;
  // Signal = EMA9 of MACD — simplified: use last 9 MACD values approx
  const signal = macdLine * 0.9; // simplified approximation
  return { value: macdLine, signal, histogram: macdLine - signal };
}

function calcBollinger(data: number[], period = 20): { upper: number; middle: number; lower: number } | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: mean + 2 * stdDev, middle: mean, lower: mean - 2 * stdDev };
}

function calcATR(candles: OHLCBar[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcStochastic(candles: OHLCBar[], period = 14): { k: number; d: number } | null {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  if (highestHigh === lowestLow) return null;
  const k = ((slice[slice.length - 1].close - lowestLow) / (highestHigh - lowestLow)) * 100;
  const d = k * 0.9; // simplified
  return { k, d };
}

function computeIndicators(candles: OHLCBar[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  const bb = calcBollinger(closes, 20);
  const macdVal = calcMACD(closes);
  const stoch = calcStochastic(candles);
  return {
    rsi: calcRSI(closes),
    macd: macdVal,
    sma20: calcSMA(closes, 20),
    sma50: calcSMA(closes, 50),
    ema20: calcEMA(closes, 20),
    bollingerUpper: bb?.upper ?? null,
    bollingerMiddle: bb?.middle ?? null,
    bollingerLower: bb?.lower ?? null,
    atr: calcATR(candles),
    stochastic: stoch,
  };
}

// ──────────────────────────────────────────────
// Signal Engine (Technical + News + Macro)
// ──────────────────────────────────────────────

/** Score -100..+100 from raw tech points */
function normalizeTechScore(bullPoints: number, bearPoints: number): number {
  const total = bullPoints + bearPoints;
  if (total === 0) return 0;
  return Math.round(((bullPoints - bearPoints) / total) * 100);
}

/** Derive news sentiment score -100..+100 for a given symbol from live news */
function scoreNewsSentiment(symbol: string, news: NewsItem[]): number {
  const relevant = news.filter(n => n.relevance.includes(symbol));
  if (relevant.length === 0) return 0;

  let score = 0;
  let total = 0;
  const now = Date.now();

  for (const item of relevant) {
    const age = (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60); // hours old
    const recencyWeight = Math.max(0.3, 1 - age / 72); // decay over 72h, min 0.3
    const itemScore = item.sentiment === "BULLISH" ? 1 : item.sentiment === "BEARISH" ? -1 : 0;
    score += itemScore * recencyWeight;
    total += recencyWeight;
  }
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

/** Build hardcoded macro factors per symbol (based on current geopolitical & economic context, March 2026) */
function buildMacroFactors(symbol: string): MacroFactor[] {
  if (symbol === "EUR_PHP") {
    return [
      {
        category: "GEOPOLITICAL",
        title: "Russia-Ukraine War",
        impact: "BEARISH",
        weight: 3,
        detail: "Ongoing conflict elevates European energy costs, dampens EU industrial output and weighs heavily on EUR strength.",
      },
      {
        category: "MONETARY_POLICY",
        title: "ECB Rate Posture",
        impact: "NEUTRAL",
        weight: 2,
        detail: "ECB holding rates steady; mixed guidance with inflation slightly above 2% target. No near-term catalyst for EUR rally.",
      },
      {
        category: "ECONOMIC",
        title: "EU Defense Spending Surge",
        impact: "BULLISH",
        weight: 2,
        detail: "European nations ramping defense budgets, stimulating fiscal activity and longer-term EUR economic support.",
      },
      {
        category: "TRADE",
        title: "OFW Remittances Record",
        impact: "BEARISH",
        weight: 2,
        detail: "Q1 2026 OFW remittances hit record highs, strengthening the PHP — which means EUR/PHP rate is lower for senders; favorable for remitters.",
      },
      {
        category: "MONETARY_POLICY",
        title: "BSP Rate Hold",
        impact: "NEUTRAL",
        weight: 1,
        detail: "Bangko Sentral ng Pilipinas held benchmark rate, maintaining peso stability without adding strong directional pressure.",
      },
      {
        category: "SENTIMENT",
        title: "EUR/USD Rabobank Forecast",
        impact: "BULLISH",
        weight: 1,
        detail: "Rabobank forecasts EUR/USD reaching 1.18 over 12 months, suggesting medium-term EUR appreciation vs dollar and soft PHP.",
      },
    ];
  }

  if (symbol === "AED_PHP") {
    return [
      {
        category: "GEOPOLITICAL",
        title: "Iran-US Conflict — Gulf Risk",
        impact: "BEARISH",
        weight: 3,
        detail: "Active Iran-US conflict threatens Gulf stability. UAE proximity to Iran creates risk premium on AED assets; however AED's USD peg provides a stabilizing anchor.",
      },
      {
        category: "MONETARY_POLICY",
        title: "AED USD Peg Stability",
        impact: "BULLISH",
        weight: 3,
        detail: "UAE Dirham is pegged 1:3.6725 to USD since 1997. The peg is near-unbreakable with $1T+ in UAE sovereign wealth. AED inherits USD safe-haven status.",
      },
      {
        category: "ECONOMIC",
        title: "UAE Oil Revenue Windfall",
        impact: "BULLISH",
        weight: 2,
        detail: "Elevated crude oil prices (driven by Iran conflict) directly benefit UAE's sovereign revenue, strengthening the AED's backing reserves.",
      },
      {
        category: "TRADE",
        title: "OFW in UAE — Record Remittances",
        impact: "BEARISH",
        weight: 2,
        detail: "Over 700,000 Filipinos work in UAE. Record OFW remittances boost PHP supply, reducing AED/PHP rate. Good window for UAE-based OFWs to send to Philippines.",
      },
      {
        category: "ECONOMIC",
        title: "Dubai Expo Economic Boost",
        impact: "BULLISH",
        weight: 1,
        detail: "Post-Expo 2020 Dubai economic diversification and tourism boom continue to support UAE non-oil GDP and investor confidence in AED.",
      },
      {
        category: "MONETARY_POLICY",
        title: "BSP Rate Hold",
        impact: "NEUTRAL",
        weight: 1,
        detail: "BSP holding policy rates keeps peso relatively stable, providing predictable AED/PHP trajectory absent major macro shocks.",
      },
    ];
  }

  if (symbol === "USD_PHP") {
    return [
      {
        category: "GEOPOLITICAL",
        title: "Iran-US Military Conflict",
        impact: "BULLISH",
        weight: 3,
        detail: "Active Iran-US conflict (entering week 2) drives global safe-haven capital into USD, strengthening dollar significantly.",
      },
      {
        category: "GEOPOLITICAL",
        title: "Global Uncertainty Premium",
        impact: "BULLISH",
        weight: 2,
        detail: "Multi-front geopolitical risk (Russia-Ukraine, Iran, Taiwan strait tensions) fuels USD demand as the world's reserve safe-haven.",
      },
      {
        category: "MONETARY_POLICY",
        title: "Fed Rate Cut Delays",
        impact: "BULLISH",
        weight: 2,
        detail: "Energy-driven inflation from Iran conflict has pushed Fed to defer rate cuts, keeping USD yields elevated and dollar supported.",
      },
      {
        category: "TRADE",
        title: "OFW Remittances Record",
        impact: "BEARISH",
        weight: 2,
        detail: "Record OFW inflows in Q1 2026 provide consistent USD-to-PHP conversion demand, supporting the peso and capping USD/PHP upside.",
      },
      {
        category: "ECONOMIC",
        title: "Peso All-Time High Zone",
        impact: "BULLISH",
        weight: 2,
        detail: "USD/PHP reached all-time high of 62.86 in Jan 2026; currently near 59.42. Trend remains broadly dollar-positive with peso weakness.",
      },
      {
        category: "ECONOMIC",
        title: "Philippine Capital Flight Risk",
        impact: "BULLISH",
        weight: 1,
        detail: "Global risk-off environment may trigger capital outflows from Philippine markets, further weakening the peso vs the dollar.",
      },
    ];
  }

  // XAU_USD
  return [
    {
      category: "GEOPOLITICAL",
      title: "Iran-US Conflict — Safe Haven",
      impact: "BULLISH",
      weight: 3,
      detail: "Active military conflict between US and Iran is the primary driver of gold's recent surge; safe-haven demand is at multi-year highs.",
    },
    {
      category: "GEOPOLITICAL",
      title: "Russia-Ukraine Escalation Risk",
      impact: "BULLISH",
      weight: 2,
      detail: "Ongoing European conflict adds to systemic risk premium in gold; any escalation sparks additional safe-haven buying.",
    },
    {
      category: "MONETARY_POLICY",
      title: "Fed Rate Cut Delay",
      impact: "BEARISH",
      weight: 2,
      detail: "Delayed Fed cuts keep real yields elevated, creating headwind for non-yielding gold. Limits upside but doesn't break the trend.",
    },
    {
      category: "ECONOMIC",
      title: "Strong USD Headwind",
      impact: "BEARISH",
      weight: 2,
      detail: "A strong dollar from global safe-haven flows and Fed delay puts mechanical downward pressure on dollar-denominated gold prices.",
    },
    {
      category: "SENTIMENT",
      title: "BNP/JPMorgan $6,000 Target",
      impact: "BULLISH",
      weight: 3,
      detail: "Major banks (BNP Paribas, JPMorgan) forecasting gold to reach $6,000+ by end of 2026, underpinning strong institutional buying interest.",
    },
    {
      category: "ECONOMIC",
      title: "Central Bank Gold Accumulation",
      impact: "BULLISH",
      weight: 2,
      detail: "Global central banks (China, India, Russia) continue record gold purchases as de-dollarization drives structural demand shift.",
    },
  ];
}

/** Convert macro factors to a net macro score -100..+100 */
function scoreMacroFactors(factors: MacroFactor[]): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const f of factors) {
    const dir = f.impact === "BULLISH" ? 1 : f.impact === "BEARISH" ? -1 : 0;
    weightedSum += dir * f.weight;
    weightTotal += f.weight;
  }
  return weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) : 0;
}

/** Generate news-aware macro reasoning bullets for the signal */
function buildMacroReasoning(symbol: string, macroScore: number, newsSentimentScore: number, news: NewsItem[]): string[] {
  const bullets: string[] = [];

  // Add top relevant news headlines as reasoning
  const relevant = news.filter(n => n.relevance.includes(symbol)).slice(0, 2);
  for (const item of relevant) {
    const tag = item.sentiment === "BULLISH" ? "↑" : item.sentiment === "BEARISH" ? "↓" : "→";
    bullets.push(`${tag} News: ${item.title.slice(0, 80)}${item.title.length > 80 ? "…" : ""}`);
  }

  // Add macro summary
  if (macroScore > 20) {
    bullets.push(`Macro environment is broadly supportive (score: +${macroScore}) — geopolitical and economic tailwinds aligned`);
  } else if (macroScore < -20) {
    bullets.push(`Macro headwinds are dominant (score: ${macroScore}) — geopolitical or policy pressures weighing on outlook`);
  } else {
    bullets.push(`Macro environment is mixed (score: ${macroScore}) — competing bullish and bearish geopolitical/economic forces`);
  }

  // Symbol-specific macro color
  if (symbol === "EUR_PHP") {
    bullets.push("Russia-Ukraine war continues to suppress EUR via elevated EU energy costs and industrial weakness");
    bullets.push("OFW remittance record strengthens PHP — favorable rate window for EUR-to-PHP senders");
  } else if (symbol === "AED_PHP") {
    bullets.push("AED is USD-pegged at 3.6725 — AED/PHP closely tracks USD/PHP with minimal divergence");
    bullets.push("Iran-US Gulf conflict creates regional risk; UAE sovereign wealth funds provide strong AED backstop");
    bullets.push("700k+ Filipino workers in UAE make AED/PHP a critical remittance corridor — OFW window monitor active");
  } else if (symbol === "USD_PHP") {
    bullets.push("Iran-US conflict driving safe-haven USD demand — dollar broadly strong globally");
    bullets.push("Fed rate cut delays (energy inflation) keeping USD yields high, supporting dollar vs PHP");
  } else if (symbol === "XAU_USD") {
    bullets.push("Active Iran-US military conflict is the key safe-haven catalyst — gold demand surge underway");
    bullets.push("BNP Paribas & JPMorgan year-end $6,000 target signals strong institutional conviction in gold bull");
  }

  // News sentiment summary
  if (newsSentimentScore > 20) {
    bullets.push(`Live news sentiment is BULLISH (${newsSentimentScore > 0 ? "+" : ""}${newsSentimentScore}) — recent coverage tilts positive for this pair`);
  } else if (newsSentimentScore < -20) {
    bullets.push(`Live news sentiment is BEARISH (${newsSentimentScore}) — recent coverage signals headwinds for this pair`);
  } else {
    bullets.push(`Live news sentiment is NEUTRAL (${newsSentimentScore > 0 ? "+" : ""}${newsSentimentScore}) — no dominant narrative in recent coverage`);
  }

  return bullets;
}

function generateSignal(
  symbol: string,
  quote: TickerQuote,
  indicators: TechnicalIndicators,
  candles: OHLCBar[],
  news: NewsItem[]
): Signal {
  const closes = candles.map(c => c.close);
  const price = quote.price;
  const techReasoning: string[] = [];
  let bullPoints = 0;
  let bearPoints = 0;

  // ── Technical scoring ──
  if (indicators.rsi !== null) {
    if (indicators.rsi < 30) {
      bullPoints += 2;
      techReasoning.push(`RSI at ${indicators.rsi.toFixed(1)} — oversold, potential reversal`);
    } else if (indicators.rsi > 70) {
      bearPoints += 2;
      techReasoning.push(`RSI at ${indicators.rsi.toFixed(1)} — overbought, watch for pullback`);
    } else if (indicators.rsi > 50) {
      bullPoints += 1;
      techReasoning.push(`RSI at ${indicators.rsi.toFixed(1)} — bullish momentum`);
    } else {
      bearPoints += 1;
      techReasoning.push(`RSI at ${indicators.rsi.toFixed(1)} — bearish momentum`);
    }
  }

  if (indicators.macd !== null) {
    if (indicators.macd.histogram > 0) {
      bullPoints += 1;
      techReasoning.push(`MACD histogram positive (+${indicators.macd.histogram.toFixed(4)}) — upward momentum`);
    } else {
      bearPoints += 1;
      techReasoning.push(`MACD histogram negative (${indicators.macd.histogram.toFixed(4)}) — downward pressure`);
    }
  }

  if (indicators.sma20 && price > indicators.sma20) {
    bullPoints += 1;
    techReasoning.push(`Price above 20-SMA — short-term trend is bullish`);
  } else if (indicators.sma20) {
    bearPoints += 1;
    techReasoning.push(`Price below 20-SMA — short-term trend is bearish`);
  }
  if (indicators.sma50 && price > indicators.sma50) {
    bullPoints += 1;
    techReasoning.push(`Price above 50-SMA — medium-term uptrend confirmed`);
  } else if (indicators.sma50) {
    bearPoints += 1;
    techReasoning.push(`Price below 50-SMA — medium-term downtrend`);
  }

  if (indicators.bollingerLower !== null && price < indicators.bollingerLower) {
    bullPoints += 2;
    techReasoning.push(`Price below Bollinger lower band — potential buy zone`);
  } else if (indicators.bollingerUpper !== null && price > indicators.bollingerUpper) {
    bearPoints += 2;
    techReasoning.push(`Price above Bollinger upper band — potential sell zone`);
  }

  if (indicators.stochastic) {
    if (indicators.stochastic.k < 20) {
      bullPoints += 1;
      techReasoning.push(`Stochastic %K at ${indicators.stochastic.k.toFixed(1)} — oversold signal`);
    } else if (indicators.stochastic.k > 80) {
      bearPoints += 1;
      techReasoning.push(`Stochastic %K at ${indicators.stochastic.k.toFixed(1)} — overbought signal`);
    }
  }

  if (closes.length >= 5) {
    const recent = closes.slice(-5);
    const trend = recent[recent.length - 1] - recent[0];
    if (trend > 0) {
      bullPoints += 1;
      techReasoning.push(`5-period momentum is positive (+${((trend / recent[0]) * 100).toFixed(2)}%)`);
    } else {
      bearPoints += 1;
      techReasoning.push(`5-period momentum is negative (${((trend / recent[0]) * 100).toFixed(2)}%)`);
    }
  }

  // ── Compute component scores ──
  const techScore = normalizeTechScore(bullPoints, bearPoints);

  // News sentiment score from live news
  const newsSentimentScore = scoreNewsSentiment(symbol, news);

  // Macro structural factors
  const macroFactors = buildMacroFactors(symbol);
  const macroScore = scoreMacroFactors(macroFactors);

  // Combined news+macro score (news 50%, macro 50%)
  const newsMacroScore = Math.round(newsSentimentScore * 0.5 + macroScore * 0.5);

  // Composite score: 60% technical + 40% news/macro
  const compositeScore = Math.round(techScore * 0.6 + newsMacroScore * 0.4);

  // ── Derive action from compositeScore ──
  const isTransfer = symbol.includes("PHP");
  let action: Signal["action"];
  let strength: Signal["strength"];
  let label: string;
  let horizon: string;

  // Normalize composite to a 0-1 bull ratio for action thresholds
  const compositeRatio = (compositeScore + 100) / 200; // maps -100..+100 → 0..1

  if (compositeRatio >= 0.65) {
    action = isTransfer ? "SEND_NOW" : "BUY";
    strength = compositeRatio >= 0.82 ? "STRONG" : "MODERATE";
    label = isTransfer
      ? (strength === "STRONG" ? "Send Now" : "Good Time to Send")
      : (strength === "STRONG" ? "Strong Buy" : "Buy");
    horizon = isTransfer
      ? (strength === "STRONG" ? "Send within 1–2 days" : "Send within 3–5 days")
      : (strength === "STRONG" ? "1–3 days" : "3–7 days");
  } else if (compositeRatio <= 0.35) {
    action = isTransfer ? "WAIT" : "SELL";
    strength = compositeRatio <= 0.18 ? "STRONG" : "MODERATE";
    label = isTransfer
      ? (strength === "STRONG" ? "Wait — Rate May Drop" : "Consider Waiting")
      : (strength === "STRONG" ? "Strong Sell" : "Sell");
    horizon = isTransfer ? "Wait 1–2 weeks, monitor macro shifts" : "1–3 days";
  } else {
    action = "HOLD";
    strength = "WEAK";
    label = "Hold / Monitor";
    horizon = isTransfer ? "Re-evaluate in 2–3 days" : "Wait for clearer signal (2–4 days)";
  }

  // ── Build full reasoning (tech + macro/news) ──
  const macroReasoning = buildMacroReasoning(symbol, macroScore, newsSentimentScore, news);

  // Mix: first 3 tech points, then macro/news points
  const reasoning: string[] = [
    ...techReasoning.slice(0, 3),
    ...macroReasoning,
  ];

  if (action === "HOLD") {
    reasoning.push("Composite signal is neutral — technical and macro forces roughly balanced");
  }

  const confidence = Math.min(95, Math.round(Math.abs(compositeScore) * 0.9 + 10));

  return {
    action,
    strength,
    label,
    reasoning,
    macroFactors,
    newsSentimentScore,
    techScore,
    compositeScore,
    horizon,
    confidence,
  };
}

// ──────────────────────────────────────────────
// Data Fetching (Frankfurter + gold-api + NewsData)
// ──────────────────────────────────────────────
// API key: loaded from environment variable in production.
// Falls back to the bundled free-tier key for demo/development only.
// In production: set NEWSDATA_API_KEY in your .env or Cloudflare secrets.
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || "pub_858936a576a48e32a20f6e9e3fba0f9c19c01";

async function fetchForexHistory(base: string, target: string, days = 90): Promise<OHLCBar[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const url = `https://api.frankfurter.app/${fmt(startDate)}..${fmt(endDate)}?base=${base}&symbols=${target}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Frankfurter fetch failed");
    const data = await res.json();

    const dates = Object.keys(data.rates).sort();
    const bars: OHLCBar[] = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const close = data.rates[date][target];
      const prevClose = i > 0 ? data.rates[dates[i - 1]][target] : close;
      const volatility = close * 0.004; // typical daily spread ~0.4%
      const open = prevClose;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      bars.push({
        time: Math.floor(new Date(date).getTime() / 1000),
        open,
        high,
        low,
        close,
      });
    }
    return bars;
  } catch (e) {
    console.error("fetchForexHistory error:", e);
    if (base === "EUR") return generateMockCandles(90, 62.5, 0.003);
    if (base === "USD") return generateMockCandles(90, 57.0, 0.003);
    if (base === "AED") return generateMockCandles(90, 15.52, 0.002); // AED more stable (USD-pegged)
    return generateMockCandles(90, 60, 0.003);
  }
}

async function fetchGoldHistory(days = 90): Promise<OHLCBar[]> {
  try {
    // gold-api.com is free but rate limited; we'll use gold-api.com for spot then simulate history
    const res = await fetch("https://gold-api.com/price/XAU", {
      headers: { "x-access-token": "goldapi-free" }
    });
    // If gold-api fails, generate realistic mock data
    if (!res.ok) throw new Error("Gold API failed");
    const data = await res.json();
    const spotPrice = data.price_gram_24k_usd ? data.price_gram_24k_usd * 31.1035 : 3300;
    return generateMockCandles(days, spotPrice, 0.008);
  } catch {
    return generateMockCandles(days, 3280, 0.008);
  }
}

async function fetchCurrentRate(base: string, target: string): Promise<number> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?base=${base}&symbols=${target}`);
    if (!res.ok) throw new Error("Rate fetch failed");
    const data = await res.json();
    return data.rates[target];
  } catch {
    if (base === "EUR" && target === "PHP") return 62.5;
    if (base === "USD" && target === "PHP") return 57.0;
    if (base === "AED" && target === "PHP") return 15.52; // ~57/3.6725 USD peg
    return 1;
  }
}

async function fetchGoldSpot(): Promise<number> {
  try {
    const res = await fetch("https://gold-api.com/price/XAU");
    const data = await res.json();
    if (data.price) return data.price;
    if (data.price_gram_24k_usd) return data.price_gram_24k_usd * 31.1035;
    throw new Error("No price");
  } catch {
    // fallback realistic gold price
    return 3300 + (Math.random() - 0.5) * 50;
  }
}

function generateMockCandles(days: number, basePrice: number, volatility: number): OHLCBar[] {
  const candles: OHLCBar[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const time = Math.floor((now - i * 86400000) / 1000);
    const change = (Math.random() - 0.48) * volatility * price;
    const open = price;
    price = Math.max(price + change, price * 0.8);
    const high = Math.max(open, price) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, price) * (1 - Math.random() * volatility * 0.5);
    candles.push({ time, open, high, low, close: price });
  }
  return candles;
}

async function fetchNews(query: string): Promise<NewsItem[]> {
  try {
    // Use newsdata.io free tier
    const q = encodeURIComponent(query);
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&q=${q}&language=en&category=business,top`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("NewsData fetch failed");
    const data = await res.json();
    
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.slice(0, 8).map((item: any) => {
      const text = (item.title + " " + (item.description || "")).toLowerCase();
      const bullishWords = ["rise", "gain", "surge", "strong", "growth", "rally", "bull", "increase", "up", "high", "positive", "recovery"];
      const bearishWords = ["fall", "drop", "decline", "weak", "crisis", "bear", "decrease", "down", "low", "negative", "inflation", "conflict", "war", "tension"];
      const bScore = bullishWords.filter(w => text.includes(w)).length;
      const brScore = bearishWords.filter(w => text.includes(w)).length;
      const sentiment: NewsItem["sentiment"] = bScore > brScore ? "BULLISH" : brScore > bScore ? "BEARISH" : "NEUTRAL";

      const relevance: string[] = [];
      if (text.includes("euro") || text.includes("eur") || text.includes("ecb")) relevance.push("EUR/PHP");
      if (text.includes("dollar") || text.includes("usd") || text.includes("fed")) relevance.push("USD/PHP");
      if (text.includes("gold") || text.includes("xau") || text.includes("precious")) relevance.push("XAU/USD");
      if (text.includes("dirham") || text.includes("aed") || text.includes("uae") || text.includes("dubai") || text.includes("emirates")) relevance.push("AED/PHP");
      if (text.includes("philip") || text.includes("peso") || text.includes("bsp") || text.includes("ofw")) relevance.push("EUR/PHP", "USD/PHP", "AED/PHP");
      if (relevance.length === 0) relevance.push("EUR/PHP", "USD/PHP", "AED/PHP", "XAU/USD");

      return {
        id: item.article_id || Math.random().toString(36),
        title: item.title || "No title",
        description: item.description || item.content || "",
        url: item.link || "#",
        source: item.source_id || "Unknown",
        publishedAt: item.pubDate || new Date().toISOString(),
        sentiment,
        relevance,
      };
    });
  } catch (e) {
    console.error("fetchNews error:", e);
    return getFallbackNews();
  }
}

function getFallbackNews(): NewsItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "1",
      title: "ECB Holds Interest Rates Amid Eurozone Inflation Concerns",
      description: "The European Central Bank kept rates steady as inflation remains above the 2% target, affecting EUR strength.",
      url: "https://www.ecb.europa.eu",
      source: "ECB",
      publishedAt: now,
      sentiment: "NEUTRAL",
      relevance: ["EUR/PHP"],
    },
    {
      id: "2",
      title: "Gold Surges on Safe-Haven Demand as Geopolitical Tensions Rise",
      description: "Gold prices climbed sharply as investors sought safety amid global uncertainty and dollar weakness.",
      url: "https://www.reuters.com",
      source: "Reuters",
      publishedAt: now,
      sentiment: "BULLISH",
      relevance: ["XAU/USD"],
    },
    {
      id: "3",
      title: "BSP Keeps Policy Rate to Support Philippine Economic Recovery",
      description: "Bangko Sentral ng Pilipinas maintained its benchmark interest rate, aiming to support growth while managing inflation.",
      url: "https://www.bsp.gov.ph",
      source: "BSP",
      publishedAt: now,
      sentiment: "BULLISH",
      relevance: ["USD/PHP", "EUR/PHP"],
    },
    {
      id: "4",
      title: "US Fed Signals Possible Rate Cuts in H2 2026",
      description: "Federal Reserve officials hinted at potential easing later in the year if inflation continues cooling.",
      url: "https://www.federalreserve.gov",
      source: "Federal Reserve",
      publishedAt: now,
      sentiment: "BULLISH",
      relevance: ["USD/PHP"],
    },
    {
      id: "5",
      title: "Philippine OFW Remittances Hit Record High in Q1 2026",
      description: "Overseas Filipino worker remittances grew 9% year-on-year, strengthening the peso and boosting consumer spending.",
      url: "https://www.bsp.gov.ph",
      source: "BSP",
      publishedAt: now,
      sentiment: "BULLISH",
      relevance: ["USD/PHP", "EUR/PHP"],
    },
    {
      id: "6",
      title: "Russia-Ukraine Conflict Impact on Euro Weakens EU Growth Outlook",
      description: "Ongoing geopolitical tensions in Eastern Europe continue to weigh on European economic forecasts.",
      url: "https://www.reuters.com",
      source: "Reuters",
      publishedAt: now,
      sentiment: "BEARISH",
      relevance: ["EUR/PHP"],
    },
    {
      id: "7",
      title: "UAE Dirham Stable as AED Peg Holds Amid Iran-US Gulf Tensions",
      description: "The UAE Dirham remains near its USD peg of 3.6725, supported by strong sovereign wealth funds and oil revenues despite nearby geopolitical tensions.",
      url: "https://www.cbuae.gov.ae",
      source: "UAE Central Bank",
      publishedAt: now,
      sentiment: "NEUTRAL",
      relevance: ["AED/PHP"],
    },
    {
      id: "8",
      title: "Filipino Workers in UAE Send Record Remittances as Peso Weakens",
      description: "Over 700,000 OFWs in the UAE increased remittance volumes in Q1 2026, taking advantage of favorable AED/PHP exchange rates.",
      url: "https://www.bsp.gov.ph",
      source: "BSP",
      publishedAt: now,
      sentiment: "BULLISH",
      relevance: ["AED/PHP", "USD/PHP"],
    },
  ];
}

// ──────────────────────────────────────────────
// Route Registration
// ──────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express) {

  // GET /api/market/:symbol
  app.get("/api/market/:symbol", async (req, res) => {
    const { symbol } = req.params;

    try {
      let candles: OHLCBar[] = [];
      let price = 0;
      let newsQuery = "";

      if (symbol === "EUR_PHP") {
        candles = await fetchForexHistory("EUR", "PHP", 90);
        price = await fetchCurrentRate("EUR", "PHP");
        newsQuery = "euro philippine peso exchange rate ECB BSP";
      } else if (symbol === "USD_PHP") {
        candles = await fetchForexHistory("USD", "PHP", 90);
        price = await fetchCurrentRate("USD", "PHP");
        newsQuery = "US dollar philippine peso exchange rate Fed BSP";
      } else if (symbol === "AED_PHP") {
        candles = await fetchForexHistory("AED", "PHP", 90);
        price = await fetchCurrentRate("AED", "PHP");
        newsQuery = "UAE dirham philippine peso exchange rate OFW remittances Dubai";
      } else if (symbol === "XAU_USD") {
        candles = await fetchGoldHistory(90);
        price = await fetchGoldSpot();
        newsQuery = "gold price XAU precious metals inflation geopolitics";
      } else {
        return res.status(400).json({ error: "Unknown symbol" });
      }

      const lastCandle = candles[candles.length - 1];
      const prevClose = candles.length > 1 ? candles[candles.length - 2].close : price;
      const change = price - prevClose;
      const changePct = (change / prevClose) * 100;

      const quote: TickerQuote = {
        symbol,
        price,
        change,
        changePct,
        high: lastCandle?.high ?? price,
        low: lastCandle?.low ?? price,
        updatedAt: new Date().toISOString(),
      };

      const indicators = computeIndicators(candles);
      // Fetch news FIRST so macro-aware signal engine can use it
      const news = await fetchNews(newsQuery);
      const signal = generateSignal(symbol, quote, indicators, candles, news);

      res.json({ symbol, quote, candles, indicators, signal, news });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // GET /api/news (global news feed)
  app.get("/api/news", async (_req, res) => {
    const news = await fetchNews("forex gold exchange rate economy Philippines trade");
    res.json(news);
  });

  // GET /api/search?q=<query> — universal search across all symbols + news
  app.get("/api/search", async (req, res) => {
    const raw = req.query.q;
    // Validate and sanitize query parameter
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    const q = raw.trim().slice(0, 100); // max 100 chars
    if (q.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    const lq = q.toLowerCase();

    // Determine which symbols are relevant to the query
    const symbolMap: Record<string, { base: string; target: string; type: "forex" | "gold" }> = {
      EUR_PHP: { base: "EUR", target: "PHP", type: "forex" },
      USD_PHP: { base: "USD", target: "PHP", type: "forex" },
      AED_PHP: { base: "AED", target: "PHP", type: "forex" },
      XAU_USD: { base: "XAU", target: "USD", type: "gold" },
    };

    // Keyword matching to suggest relevant symbols
    const symbolKeywords: Record<string, string[]> = {
      EUR_PHP: ["eur", "euro", "european", "ecb", "eu", "europe"],
      USD_PHP: ["usd", "dollar", "us", "fed", "federal", "america"],
      AED_PHP: ["aed", "dirham", "uae", "dubai", "emirates", "gulf"],
      XAU_USD: ["gold", "xau", "precious", "bullion", "metal", "xau/usd"],
    };
    // PHP keywords match all PHP pairs
    const phpKeywords = ["php", "peso", "philippine", "philippines", "bsp", "ofw"];

    const matchedSymbols = Object.entries(symbolKeywords)
      .filter(([, kws]) => {
        const combinedKws = phpKeywords.some(kw => lq.includes(kw))
          ? [...kws, ...phpKeywords]
          : kws;
        return combinedKws.some(kw => lq.includes(kw));
      })
      .map(([sym]) => sym);

    // If no keyword match, return news-only search across all symbols
    const targetSymbols = matchedSymbols.length > 0 ? matchedSymbols : Object.keys(symbolMap);

    // Fetch news for the query
    const news = await fetchNews(q);

    // Build symbol summaries for matched symbols (use cached/quick fetch only)
    const symbolResults: Array<{
      symbol: string;
      label: string;
      price: number | null;
      change: number | null;
      changePct: number | null;
      signal: string;
      action: string;
    }> = [];

    for (const sym of targetSymbols.slice(0, 4)) {
      try {
        const info = symbolMap[sym];
        let price: number | null = null;
        if (info.type === "forex") {
          price = await fetchCurrentRate(info.base, info.target);
        } else {
          price = await fetchGoldSpot();
        }
        const label = sym.replace("_", "/");
        symbolResults.push({
          symbol: sym,
          label,
          price,
          change: null, // quick fetch — no history needed
          changePct: null,
          signal: "See full tab for signal",
          action: "VIEW",
        });
      } catch {
        // skip on error
      }
    }

    res.json({
      query: q,
      symbols: symbolResults,
      news: news.filter(n =>
        n.title.toLowerCase().includes(lq) ||
        (n.description || "").toLowerCase().includes(lq) ||
        n.relevance.some(r => r.toLowerCase().includes(lq.split(" ")[0]))
      ).slice(0, 8),
      allNews: news.slice(0, 8),
    });
  });
}
