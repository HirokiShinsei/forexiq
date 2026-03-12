import type { PeriodSnapshot, TickerQuote } from "../../../shared/schema";
import { TrendingUp, TrendingDown, Minus, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  quote: TickerQuote;
  periodStats?: PeriodSnapshot[];
  symbol: string;
}

function fmt(price: number, symbol: string) {
  if (symbol === "XAU_USD")
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtCompact(price: number, symbol: string) {
  if (symbol === "XAU_USD")
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/** Mini candlestick/range icon showing open vs close direction */
function RangeIcon({ open, close, size = 20 }: { open: number; close: number; size?: number }) {
  const isUp = close > open * 1.00001;
  const isDown = close < open * 0.99999;
  const color = isUp ? "#34d399" : isDown ? "#f87171" : "#94a3b8";
  const bodyH = size * 0.45;
  const wickH = size * 0.2;
  const totalH = bodyH + wickH * 2;
  const w = size * 0.5;
  const cx = w / 2;

  return (
    <svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`} style={{ flexShrink: 0 }}>
      {/* Upper wick */}
      <line
        x1={cx} y1={0} x2={cx} y2={wickH}
        stroke={color} strokeWidth={1.5} strokeLinecap="round"
      />
      {/* Body */}
      <rect
        x={1} y={wickH}
        width={w - 2} height={bodyH}
        rx={2}
        fill={isUp ? color : "transparent"}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Lower wick */}
      <line
        x1={cx} y1={wickH + bodyH} x2={cx} y2={totalH}
        stroke={color} strokeWidth={1.5} strokeLinecap="round"
      />
    </svg>
  );
}

/** Horizontal range bar showing open–close spread within a min–max context */
function RangeBar({ open, close, min, max }: { open: number; close: number; min: number; max: number }) {
  const span = max - min || 1;
  const openPct = ((open - min) / span) * 100;
  const closePct = ((close - min) / span) * 100;
  const left = Math.min(openPct, closePct);
  const width = Math.abs(closePct - openPct);
  const isUp = close >= open;

  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
      <div
        className={`absolute top-0 h-full rounded-full ${isUp ? "bg-emerald-500/70" : "bg-red-500/70"}`}
        style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
      />
      {/* Open marker */}
      <div
        className="absolute top-0 h-full w-0.5 bg-slate-400/80 rounded-full"
        style={{ left: `${openPct}%` }}
      />
    </div>
  );
}

interface PeriodRowProps {
  period: PeriodSnapshot;
  symbol: string;
  allPeriods: PeriodSnapshot[];
  quote: TickerQuote;
}

function PeriodRow({ period, symbol, allPeriods, quote }: PeriodRowProps) {
  const { label, open, close, changePct } = period;
  const isUp = changePct > 0.005;
  const isDown = changePct < -0.005;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  // Compute overall min/max across all periods + current live for range bar context
  const allValues = [...allPeriods.flatMap(p => [p.open, p.close]), quote.price, quote.high ?? quote.price, quote.low ?? quote.price];
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);

  const dirColor = isUp
    ? "text-emerald-400"
    : isDown
    ? "text-red-400"
    : "text-slate-400";

  const bgAccent = isUp
    ? "border-emerald-500/20"
    : isDown
    ? "border-red-500/20"
    : "border-slate-600/20";

  return (
    <div className={`px-4 py-3.5 border-b border-border/30 last:border-0 hover:bg-white/[0.02] transition-colors`}>
      <div className="flex items-start gap-3">
        {/* Mini candle icon */}
        <div className="mt-1 flex-shrink-0">
          <RangeIcon open={open} close={close} size={22} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: label + change badge + close price */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${dirColor}`}>
                <Icon size={11} />
                {isUp ? "+" : ""}{changePct.toFixed(3)}%
              </span>
              <span className={`text-sm font-bold tabular-nums text-foreground`}>
                {fmt(close, symbol)}
              </span>
            </div>
          </div>

          {/* Range bar */}
          <RangeBar open={open} close={close} min={globalMin} max={globalMax} />

          {/* Bottom row: open / close labels */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Open{" "}
              <span className="tabular-nums text-foreground/70 font-medium">
                {fmtCompact(open, symbol)}
              </span>
            </span>
            <span>
              Close{" "}
              <span className={`tabular-nums font-semibold ${dirColor}`}>
                {fmtCompact(close, symbol)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PriceHistoryPanel({ quote, periodStats, symbol }: Props) {
  const isGold = symbol === "XAU_USD";
  const currency = isGold ? "USD" : "PHP";
  const isUp = quote.changePct > 0.005;
  const isDown = quote.changePct < -0.005;
  const LiveIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const liveColor = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-400";
  const liveBg = isUp ? "bg-emerald-500/10 border-emerald-500/25" : isDown ? "bg-red-500/10 border-red-500/25" : "bg-slate-500/10 border-slate-500/25";

  const hasHigh = quote.high != null && Math.abs(quote.high - quote.price) > 0.00001;
  const hasLow  = quote.low  != null && Math.abs(quote.low  - quote.price) > 0.00001;

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Price History
        </span>
        <span className="text-xs text-muted-foreground/60">in {currency}</span>
      </div>

      {/* ── Live Price ── */}
      <div className="px-4 py-4 border-b border-border/40 bg-primary/5">
        <div className="flex items-center justify-between">
          {/* Left: label + live dot */}
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Live Price</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              <span className="text-xs text-muted-foreground">now</span>
            </span>
          </div>
          {/* Right: change chip + price */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium tabular-nums ${liveColor} ${liveBg}`}>
              <LiveIcon size={10} />
              {isUp ? "+" : ""}{quote.changePct.toFixed(3)}%
            </span>
            <span className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
              {fmt(quote.price, symbol)}
            </span>
          </div>
        </div>

        {/* Day high / low pills */}
        {(hasHigh || hasLow) && (
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/8 border border-emerald-500/20">
              <span className="text-xs text-muted-foreground">Day H</span>
              <span className="text-xs font-bold tabular-nums text-emerald-400">
                {fmt(quote.high ?? quote.price, symbol)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/8 border border-red-500/20">
              <span className="text-xs text-muted-foreground">Day L</span>
              <span className="text-xs font-bold tabular-nums text-red-400">
                {fmt(quote.low ?? quote.price, symbol)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Period Rows ── */}
      {periodStats && periodStats.length > 0 ? (
        <div>
          {periodStats.map((p) => (
            <PeriodRow
              key={p.label}
              period={p}
              symbol={symbol}
              allPeriods={periodStats}
              quote={quote}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-xs text-muted-foreground text-center">
          Loading period data…
        </div>
      )}
    </div>
  );
}
