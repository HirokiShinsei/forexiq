import type { PeriodSnapshot, TickerQuote } from "../../../shared/schema";
import { TrendingUp, TrendingDown, Minus, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  quote: TickerQuote;
  periodStats?: PeriodSnapshot[];
  symbol: string;
}

// ── Number formatting ──────────────────────────────────────────────────
function fmt(price: number, symbol: string) {
  if (symbol === "XAU_USD")
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

// ── Tiny inline spark bar: open → close within global range ───────────
function SparkBar({
  open, close, min, max, isUp,
}: {
  open: number; close: number; min: number; max: number; isUp: boolean;
}) {
  const span = max - min || 1;
  const openPct  = ((open  - min) / span) * 100;
  const closePct = ((close - min) / span) * 100;
  const left  = Math.min(openPct, closePct);
  const width = Math.max(Math.abs(closePct - openPct), 3);

  return (
    <div className="relative h-1 w-full rounded-full bg-slate-700/50 overflow-visible">
      {/* Filled range */}
      <div
        className={`absolute top-0 h-full rounded-full ${isUp ? "bg-emerald-500/60" : "bg-red-500/60"}`}
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      {/* Open tick — a slightly taller white stroke */}
      <div
        className="absolute -top-0.5 h-2 w-px bg-slate-400/70 rounded-full"
        style={{ left: `${openPct}%` }}
      />
    </div>
  );
}

// ── Mini SVG candle icon ───────────────────────────────────────────────
function CandleIcon({ isUp, isFlat }: { isUp: boolean; isFlat: boolean }) {
  const color = isFlat ? "#64748b" : isUp ? "#34d399" : "#f87171";
  return (
    <svg width="10" height="18" viewBox="0 0 10 18" fill="none" style={{ flexShrink: 0 }}>
      {/* Top wick */}
      <line x1="5" y1="0" x2="5" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Body */}
      <rect
        x="1.5" y="4" width="7" height="10" rx="1.5"
        fill={isUp ? color : "transparent"}
        stroke={color} strokeWidth="1.5"
      />
      {/* Bottom wick */}
      <line x1="5" y1="14" x2="5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Period card ────────────────────────────────────────────────────────
function PeriodCard({
  period, symbol, globalMin, globalMax,
}: {
  period: PeriodSnapshot;
  symbol: string;
  globalMin: number;
  globalMax: number;
}) {
  const { label, open, close, changePct } = period;
  const isUp   = changePct >  0.005;
  const isDown = changePct < -0.005;
  const isFlat = !isUp && !isDown;

  const dirColor  = isUp ? "text-emerald-400"  : isDown ? "text-red-400"  : "text-slate-400";
  const dirBorder = isUp ? "border-emerald-500/20" : isDown ? "border-red-500/20" : "border-slate-600/20";
  const dirBg     = isUp ? "bg-emerald-500/6"  : isDown ? "bg-red-500/6"  : "bg-slate-500/5";
  const ChgIcon   = isUp ? ArrowUpRight        : isDown ? ArrowDownRight  : Minus;

  const absChange = Math.abs(close - open);

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border ${dirBorder} ${dirBg} p-4 transition-colors hover:bg-white/[0.03]`}
    >
      {/* ── Row 1: Label + candle icon ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <CandleIcon isUp={isUp} isFlat={isFlat} />
      </div>

      {/* ── Row 2: Close price (hero value) ── */}
      <div className="flex items-end justify-between gap-1">
        <span className="text-lg font-bold tabular-nums text-foreground leading-none">
          {fmt(close, symbol)}
        </span>
        {/* Change badge */}
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${dirColor}`}>
          <ChgIcon size={11} />
          {isUp ? "+" : ""}{changePct.toFixed(3)}%
        </span>
      </div>

      {/* ── Row 3: Spark bar ── */}
      <SparkBar open={open} close={close} min={globalMin} max={globalMax} isUp={isUp} />

      {/* ── Row 4: Open / Change detail ── */}
      <div className="flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <div className="text-muted-foreground/60 uppercase tracking-wide text-[10px]">Open</div>
          <div className="tabular-nums text-muted-foreground font-medium">{fmt(open, symbol)}</div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-muted-foreground/60 uppercase tracking-wide text-[10px]">Change</div>
          <div className={`tabular-nums font-semibold ${dirColor}`}>
            {isUp ? "+" : isDown ? "-" : ""}{fmt(absChange, symbol)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function PriceHistoryPanel({ quote, periodStats, symbol }: Props) {
  const isGold  = symbol === "XAU_USD";
  const currency = isGold ? "USD" : "PHP";

  const isUp   = quote.changePct >  0.005;
  const isDown = quote.changePct < -0.005;
  const LiveIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const liveColor = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-400";
  const livePillCls = isUp
    ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
    : isDown
    ? "bg-red-500/12 border-red-500/30 text-red-400"
    : "bg-slate-500/10 border-slate-500/25 text-slate-400";

  const hasDistinctHigh = quote.high != null && Math.abs((quote.high ?? 0) - quote.price) > 0.00001;
  const hasDistinctLow  = quote.low  != null && Math.abs((quote.low  ?? 0) - quote.price) > 0.00001;

  // Global min/max for the spark bars — draw all periods + today's H/L in one scale
  const allValues = periodStats
    ? [...periodStats.flatMap(p => [p.open, p.close]), quote.price,
       quote.high ?? quote.price, quote.low ?? quote.price]
    : [quote.price];
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">

      {/* ── Section label ── */}
      <div className="px-5 pt-4 pb-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Price History
        </span>
        <span className="text-[11px] text-muted-foreground/50">in {currency}</span>
      </div>

      {/* ── Live price hero card ── */}
      <div className="px-5 pt-3 pb-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">

          {/* Left: label + live dot */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-primary opacity-80" />
              <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Live Price</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                <span className="text-[11px] text-muted-foreground">now</span>
              </span>
            </div>

            {/* Big price */}
            <span className="text-3xl font-bold tabular-nums text-foreground leading-none tracking-tight">
              {fmt(quote.price, symbol)}
            </span>

            {/* Change pill */}
            <span className={`inline-flex items-center gap-1 self-start px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${livePillCls}`}>
              <LiveIcon size={11} />
              {isUp ? "+" : ""}{quote.changePct.toFixed(3)}%
              <span className="text-muted-foreground/60 font-normal ml-0.5">vs prev close</span>
            </span>
          </div>

          {/* Right: Day H / L stacked */}
          {(hasDistinctHigh || hasDistinctLow) && (
            <div className="flex flex-col gap-2 text-right flex-shrink-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Day High</span>
                <span className="text-sm font-bold tabular-nums text-emerald-400">
                  {fmt(quote.high ?? quote.price, symbol)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Day Low</span>
                <span className="text-sm font-bold tabular-nums text-red-400">
                  {fmt(quote.low ?? quote.price, symbol)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Period cards grid ── */}
      <div className="p-4">
        {periodStats && periodStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {periodStats.map((p) => (
              <PeriodCard
                key={p.label}
                period={p}
                symbol={symbol}
                globalMin={globalMin}
                globalMax={globalMax}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-xs text-muted-foreground text-center">
            Loading period data…
          </div>
        )}
      </div>

    </div>
  );
}
