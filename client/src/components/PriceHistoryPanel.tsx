import type { PeriodSnapshot, TickerQuote } from "../../../shared/schema";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

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

// Solid triangle — up or down
function Triangle({ dir, size = 10 }: { dir: "up" | "down" | "flat"; size?: number }) {
  if (dir === "flat")
    return <Minus size={size} className="text-slate-400" />;
  const pts =
    dir === "up"
      ? `${size / 2},0 ${size},${size} 0,${size}`
      : `0,0 ${size},0 ${size / 2},${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: "block" }}>
      <polygon
        points={pts}
        fill={dir === "up" ? "#34d399" : "#f87171"}
      />
    </svg>
  );
}

// ── Period card ────────────────────────────────────────────────────────
function PeriodCard({ period, symbol }: { period: PeriodSnapshot; symbol: string }) {
  const { label, open, close, changePct, openDate, closeDate } = period;
  const isUp   = changePct >  0.005;
  const isDown = changePct < -0.005;
  const dir: "up" | "down" | "flat" = isUp ? "up" : isDown ? "down" : "flat";

  const priceColor  = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-300";
  const pctColor    = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-400";
  const borderColor = isUp ? "border-emerald-500/25" : isDown ? "border-red-500/25" : "border-slate-600/25";
  const bgColor     = isUp ? "bg-emerald-500/[0.05]" : isDown ? "bg-red-500/[0.05]" : "bg-slate-800/40";

  // Show date range: if openDate === closeDate, show just one date
  const dateRange =
    openDate === closeDate
      ? openDate
      : `${openDate} – ${closeDate}`;

  const absChange = Math.abs(close - open);

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 flex flex-col gap-3`}>

      {/* ── Top row: label + triangle ── */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Triangle dir={dir} size={11} />
      </div>

      {/* ── Close price — hero ── */}
      <div className="flex items-end justify-between gap-2">
        <span className={`text-xl font-bold tabular-nums leading-none ${priceColor}`}>
          {fmt(close, symbol)}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${pctColor} pb-0.5`}>
          {isUp ? "+" : ""}{changePct.toFixed(3)}%
        </span>
      </div>

      {/* ── Divider ── */}
      <div className={`h-px ${isUp ? "bg-emerald-500/15" : isDown ? "bg-red-500/15" : "bg-slate-700/50"}`} />

      {/* ── Open / Change row ── */}
      <div className="flex justify-between text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Open</span>
          <span className="tabular-nums text-muted-foreground font-medium">{fmt(open, symbol)}</span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Change</span>
          <span className={`tabular-nums font-semibold ${pctColor}`}>
            {isDown ? "−" : isUp ? "+" : ""}{fmt(absChange, symbol)}
          </span>
        </div>
      </div>

      {/* ── Date range ── */}
      <div className="text-[11px] text-muted-foreground/50 tabular-nums">
        {dateRange}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────
export default function PriceHistoryPanel({ quote, periodStats, symbol }: Props) {
  const isGold   = symbol === "XAU_USD";
  const currency = isGold ? "USD" : "PHP";

  const isUp   = quote.changePct >  0.005;
  const isDown = quote.changePct < -0.005;

  const LiveIcon   = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const liveColor  = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-400";
  const priceColor = isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-100";
  const pillCls    = isUp
    ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
    : isDown
    ? "bg-red-500/12 border-red-500/30 text-red-400"
    : "bg-slate-500/10 border-slate-500/25 text-slate-400";

  const hasDistinctHigh = (quote.high ?? 0) > 0 && Math.abs((quote.high ?? 0) - quote.price) > 0.00001;
  const hasDistinctLow  = (quote.low  ?? 0) > 0 && Math.abs((quote.low  ?? 0) - quote.price) > 0.00001;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Price History
        </span>
        <span className="text-[11px] text-muted-foreground/40">in {currency}</span>
      </div>

      {/* ── Live price hero ── */}
      <div className="px-5 pt-3 pb-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">

          {/* Left: label + price + pill */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Zap size={11} className="text-primary opacity-70" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Price
              </span>
              <span className="flex items-center gap-1 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-muted-foreground">now</span>
              </span>
            </div>

            <span className={`text-4xl font-bold tabular-nums leading-none tracking-tight ${priceColor}`}>
              {fmt(quote.price, symbol)}
            </span>

            <span className={`self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${pillCls}`}>
              <LiveIcon size={11} />
              {isUp ? "+" : ""}{quote.changePct.toFixed(3)}%
              <span className="font-normal text-muted-foreground/60 ml-0.5">vs prev close</span>
            </span>
          </div>

          {/* Right: Day H/L */}
          {(hasDistinctHigh || hasDistinctLow) && (
            <div className="flex flex-col gap-3 text-right flex-shrink-0">
              {hasDistinctHigh && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Day High</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-400">
                    {fmt(quote.high!, symbol)}
                  </span>
                </div>
              )}
              {hasDistinctLow && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Day Low</span>
                  <span className="text-sm font-bold tabular-nums text-red-400">
                    {fmt(quote.low!, symbol)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Period cards ── */}
      <div className="p-4">
        {periodStats && periodStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {periodStats.map((p) => (
              <PeriodCard key={p.label} period={p} symbol={symbol} />
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
