import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We use in-memory storage for this app — no DB needed
// Schema types still used for data contracts

export type OHLCBar = {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type TickerQuote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  updatedAt: string;
};

export type TechnicalIndicators = {
  rsi: number | null;
  macd: { value: number; signal: number; histogram: number } | null;
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr: number | null;
  stochastic: { k: number; d: number } | null;
};

export type MacroFactor = {
  category: "GEOPOLITICAL" | "MONETARY_POLICY" | "ECONOMIC" | "TRADE" | "SENTIMENT";
  title: string;
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
  weight: number; // 1–3
  detail: string;
};

export type Signal = {
  action: "BUY" | "SELL" | "HOLD" | "SEND_NOW" | "WAIT";
  strength: "STRONG" | "MODERATE" | "WEAK";
  label: string;
  reasoning: string[];
  macroFactors: MacroFactor[];
  newsSentimentScore: number;  // -100 (bearish) to +100 (bullish)
  techScore: number;           // -100 to +100
  compositeScore: number;      // weighted blend, -100 to +100
  horizon: string;
  confidence: number; // 0–100
};

export type NewsItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  relevance: string[]; // e.g. ["EUR/PHP", "GOLD"]
};

// Period snapshot: open/close/change for a named time window
export type PeriodSnapshot = {
  label: string;        // "Yesterday" | "Last Week" | "Last Month"
  open: number;
  close: number;        // closing price of that period
  change: number;
  changePct: number;
  openDate: string;     // ISO date string e.g. "2026-03-11"
  closeDate: string;    // ISO date string e.g. "2026-03-11"
};

export type MarketData = {
  symbol: string;
  quote: TickerQuote;
  candles: OHLCBar[];
  indicators: TechnicalIndicators;
  signal: Signal;
  news: NewsItem[];
  periodStats?: PeriodSnapshot[];  // yesterday, last week, last month
};

// AI-generated analysis report
export type AIAnalysisFactor = {
  name: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  weight: number;  // 1–3 significance
  detail: string;
};

export type AIAnalysisReport = {
  verdict: string;              // e.g. "SEND NOW" / "WAIT" / "HOLD" / "BUY" / "SELL"
  confidence: number;           // 0–100
  outlook: "BULLISH" | "BEARISH" | "NEUTRAL";
  horizon: string;              // e.g. "Next 24–48 hours"
  summary: string;              // 2–3 sentence narrative
  factors: AIAnalysisFactor[]; // key driving factors
  geopoliticalRisk: number;     // 0–100
  economicMomentum: number;     // 0–100
  newsSentiment: number;        // 0–100
  disclaimer: string;
  generatedAt: string;          // ISO timestamp
  model: string;                // which HF model was used
};
