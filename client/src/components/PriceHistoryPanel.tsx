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

function ChangeChip({ changePct }: { changePct: number }) {
  const isUp = changePct > 0.001;
  const isDown = changePct < -0.001;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const cls = isUp
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : isDown
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-tabular font-medium ${cls}`}>
      <Icon size={10} />
      {isUp ? "+" : ""}{changePct.toFixed(3)}%
    </span>
  );
}

export default function PriceHistoryPanel({ quote, periodStats, symbol }: Props) {
  const isGold = symbol === "XAU_USD";
  const currency = isGold ? "USD" : "PHP";

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Price History
        </span>
        <span className="text-xs text-muted-foreground/60">in {currency}</span>
      </div>

      {/* Live Price Row — always first, most prominent */}
      <div className="px-4 py-3 border-b border-border/40 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <Zap size={12} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Live Price</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <span className="text-xs text-muted-foreground">now</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ChangeChip changePct={quote.changePct} />
            <span className="text-xl font-bold font-tabular text-foreground tracking-tight">
              {fmt(quote.price, symbol)}
            </span>
          </div>
        </div>
        {/* Day high/low sub-row */}
        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
          <span>
            Today H{" "}
            <span className="font-tabular text-emerald-400/90 font-medium">
              {fmt(quote.high ?? quote.price, symbol)}
            </span>
          </span>
          <span>
            Today L{" "}
            <span className="font-tabular text-red-400/90 font-medium">
              {fmt(quote.low ?? quote.price, symbol)}
            </span>
          </span>
        </div>
      </div>

      {/* Period rows */}
      {periodStats && periodStats.length > 0 ? (
        <div className="divide-y divide-border/30">
          {periodStats.map((p) => {
            const isUp = p.changePct > 0.001;
            const isDown = p.changePct < -0.001;
            return (
              <div key={p.label} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                {/* Label + open */}
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">{p.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Opened at{" "}
                    <span className="font-tabular text-foreground/80">{fmt(p.open, symbol)}</span>
                  </div>
                </div>

                {/* Close + change */}
                <div className="text-right space-y-0.5">
                  <div className="text-sm font-bold font-tabular text-foreground">
                    {fmt(p.close, symbol)}
                  </div>
                  <div className={`text-xs font-tabular font-medium ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-slate-400"}`}>
                    {isUp ? "▲" : isDown ? "▼" : "—"}{" "}
                    {isUp ? "+" : ""}{fmt(Math.abs(p.change), symbol)}{" "}
                    ({isUp ? "+" : ""}{p.changePct.toFixed(3)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-xs text-muted-foreground text-center">
          Loading period data…
        </div>
      )}
    </div>
  );
}
