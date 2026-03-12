import type { TechnicalIndicators, TickerQuote } from "../../../shared/schema";
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Gauge } from "lucide-react";

interface Props {
  indicators: TechnicalIndicators;
  quote: TickerQuote;
  symbol: string;
}

type StatusLevel = "positive" | "negative" | "neutral" | "warning";

function StatusBadge({ level, text }: { level: StatusLevel; text: string }) {
  const cfg: Record<StatusLevel, string> = {
    positive: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
    negative: "bg-red-500/12 text-red-400 border-red-500/25",
    neutral:  "bg-slate-500/12 text-slate-300 border-slate-500/25",
    warning:  "bg-amber-500/12 text-amber-400 border-amber-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cfg[level]}`}>
      {text}
    </span>
  );
}

function Row({
  label,
  value,
  badge,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  badge?: { level: StatusLevel; text: string };
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <Icon size={12} className="flex-shrink-0 opacity-70" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-right">
        {badge && <StatusBadge level={badge.level} text={badge.text} />}
        <div>
          <div className="text-xs font-tabular font-semibold text-foreground">{value}</div>
          {sub && <div className="text-xs text-muted-foreground/70">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function IndicatorsSummary({ indicators, quote, symbol }: Props) {
  const { rsi, macd, sma20, sma50, bollingerUpper, bollingerLower, atr, stochastic } = indicators;
  const price = quote.price;

  // RSI interpretation
  const rsiLevel: StatusLevel =
    rsi === null ? "neutral" :
    rsi > 70 ? "negative" :
    rsi < 30 ? "positive" :
    rsi > 55 ? "positive" :
    rsi < 45 ? "negative" : "neutral";
  const rsiLabel =
    rsi === null ? "N/A" :
    rsi > 70 ? "Overbought" :
    rsi < 30 ? "Oversold" :
    rsi > 55 ? "Bullish zone" :
    rsi < 45 ? "Bearish zone" : "Neutral";

  // Trend via SMA cross
  const trendLevel: StatusLevel =
    sma20 !== null && sma50 !== null
      ? sma20 > sma50 ? "positive" : sma20 < sma50 ? "negative" : "neutral"
      : "neutral";
  const trendLabel =
    sma20 !== null && sma50 !== null
      ? sma20 > sma50 ? "Uptrend" : sma20 < sma50 ? "Downtrend" : "Sideways"
      : "N/A";

  // MACD momentum
  const macdLevel: StatusLevel =
    macd === null ? "neutral" :
    macd.histogram > 0 && macd.value > 0 ? "positive" :
    macd.histogram < 0 && macd.value < 0 ? "negative" :
    macd.histogram > 0 ? "warning" : "neutral";
  const macdLabel =
    macd === null ? "N/A" :
    macd.histogram > 0 && macd.value > 0 ? "Bullish" :
    macd.histogram < 0 && macd.value < 0 ? "Bearish" :
    macd.histogram > 0 ? "Turning up" : "Turning down";

  // Bollinger band position
  const bbLevel: StatusLevel =
    bollingerUpper === null || bollingerLower === null ? "neutral" :
    price >= bollingerUpper * 0.998 ? "warning" :
    price <= bollingerLower * 1.002 ? "warning" :
    price > (bollingerUpper + bollingerLower) / 2 ? "positive" : "negative";
  const bbLabel =
    bollingerUpper === null || bollingerLower === null ? "N/A" :
    price >= bollingerUpper * 0.998 ? "Near upper band" :
    price <= bollingerLower * 1.002 ? "Near lower band" :
    price > (bollingerUpper + bollingerLower) / 2 ? "Above midline" : "Below midline";

  // ATR volatility — express as % of price
  const atrPct = atr !== null && price > 0 ? (atr / price) * 100 : null;
  const volatilityLevel: StatusLevel =
    atrPct === null ? "neutral" :
    atrPct > 0.8 ? "warning" :
    atrPct > 0.4 ? "neutral" : "positive";
  const volatilityLabel =
    atrPct === null ? "N/A" :
    atrPct > 0.8 ? "High" :
    atrPct > 0.4 ? "Moderate" : "Low";

  // Stochastic
  const stochLevel: StatusLevel =
    stochastic === null ? "neutral" :
    stochastic.k > 80 ? "negative" :
    stochastic.k < 20 ? "positive" : "neutral";
  const stochLabel =
    stochastic === null ? "N/A" :
    stochastic.k > 80 ? "Overbought" :
    stochastic.k < 20 ? "Oversold" : "Neutral";

  const TrendIcon = trendLevel === "positive" ? TrendingUp : trendLevel === "negative" ? TrendingDown : Minus;

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
        <Activity size={12} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Technical Snapshot
        </span>
      </div>
      <div className="px-4 divide-y divide-border/20">
        <Row
          icon={Gauge}
          label="RSI (14)"
          value={rsi !== null ? rsi.toFixed(1) : "—"}
          badge={{ level: rsiLevel, text: rsiLabel }}
        />
        <Row
          icon={TrendIcon}
          label="Trend (SMA 20/50)"
          value={sma20 !== null ? `${sma20.toFixed(4)}` : "—"}
          badge={{ level: trendLevel, text: trendLabel }}
          sub={sma50 !== null ? `SMA50: ${sma50.toFixed(4)}` : undefined}
        />
        <Row
          icon={Activity}
          label="MACD Momentum"
          value={macd !== null ? (macd.histogram > 0 ? `+${macd.histogram.toFixed(5)}` : macd.histogram.toFixed(5)) : "—"}
          badge={{ level: macdLevel, text: macdLabel }}
        />
        <Row
          icon={ShieldCheck}
          label="Bollinger Bands"
          value={bollingerUpper !== null ? `${bollingerLower!.toFixed(4)}–${bollingerUpper.toFixed(4)}` : "—"}
          badge={{ level: bbLevel, text: bbLabel }}
        />
        <Row
          icon={AlertTriangle}
          label="Volatility (ATR)"
          value={atrPct !== null ? `${atrPct.toFixed(3)}%` : "—"}
          badge={{ level: volatilityLevel, text: volatilityLabel }}
          sub={atr !== null ? `ATR: ${atr.toFixed(5)}` : undefined}
        />
        <Row
          icon={Gauge}
          label="Stochastic %K"
          value={stochastic !== null ? `${stochastic.k.toFixed(1)}` : "—"}
          badge={{ level: stochLevel, text: stochLabel }}
          sub={stochastic !== null ? `%D: ${stochastic.d.toFixed(1)}` : undefined}
        />
      </div>
      <div className="px-4 py-2 border-t border-border/30 text-xs text-muted-foreground/50 italic">
        Computed from 90-day daily candles
      </div>
    </div>
  );
}
