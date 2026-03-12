import type { TechnicalIndicators } from "../../../shared/schema";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  indicators: TechnicalIndicators;
  price: number;
}

function formatVal(val: number | null, decimals = 4) {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

function RsiBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground font-tabular">—</span>;
  const pct = Math.min(100, Math.max(0, value));
  const color = value < 30 ? "#26a69a" : value > 70 ? "#ef5350" : "#f59e0b";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-tabular text-xs w-8 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function TrendIcon({ val, refVal }: { val: number | null; refVal: number }) {
  if (val === null) return <Minus size={12} className="text-muted-foreground" />;
  if (refVal > val) return <TrendingUp size={12} className="text-green-400" />;
  if (refVal < val) return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-muted-foreground" />;
}

function statusColor(cond: boolean | null) {
  if (cond === null) return "text-muted-foreground";
  return cond ? "text-green-400" : "text-red-400";
}

export default function IndicatorsPanel({ indicators, price }: Props) {
  const dp = price > 100 ? 2 : 4;

  return (
    <div className="space-y-0" data-testid="indicators-panel">
      {/* RSI */}
      <div className="indicator-row">
        <div>
          <span className="text-xs text-muted-foreground">RSI (14)</span>
        </div>
        <div className="w-36">
          <RsiBar value={indicators.rsi} />
        </div>
      </div>

      {/* MACD */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">MACD</span>
        <div className="text-right">
          <span className={`font-tabular text-xs ${indicators.macd?.histogram !== undefined && indicators.macd.histogram > 0 ? "text-green-400" : "text-red-400"}`}>
            {indicators.macd ? `${indicators.macd.value > 0 ? "+" : ""}${indicators.macd.value.toFixed(5)}` : "—"}
          </span>
          {indicators.macd && (
            <div className="text-xs text-muted-foreground">
              Sig: {indicators.macd.signal.toFixed(5)} · H: {indicators.macd.histogram > 0 ? "+" : ""}{indicators.macd.histogram.toFixed(5)}
            </div>
          )}
        </div>
      </div>

      {/* SMA 20 */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">SMA (20)</span>
        <div className="flex items-center gap-2">
          <TrendIcon val={price} refVal={indicators.sma20 ?? 0} />
          <span className={`font-tabular text-xs ${statusColor(indicators.sma20 !== null ? price > indicators.sma20 : null)}`}>
            {formatVal(indicators.sma20, dp)}
          </span>
        </div>
      </div>

      {/* SMA 50 */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">SMA (50)</span>
        <div className="flex items-center gap-2">
          <TrendIcon val={price} refVal={indicators.sma50 ?? 0} />
          <span className={`font-tabular text-xs ${statusColor(indicators.sma50 !== null ? price > indicators.sma50 : null)}`}>
            {formatVal(indicators.sma50, dp)}
          </span>
        </div>
      </div>

      {/* EMA 20 */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">EMA (20)</span>
        <div className="flex items-center gap-2">
          <TrendIcon val={price} refVal={indicators.ema20 ?? 0} />
          <span className={`font-tabular text-xs ${statusColor(indicators.ema20 !== null ? price > indicators.ema20 : null)}`}>
            {formatVal(indicators.ema20, dp)}
          </span>
        </div>
      </div>

      {/* Bollinger Bands */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">Bollinger (20,2)</span>
        <div className="text-right text-xs font-tabular space-y-0.5">
          <div className="text-red-400/70">↑ {formatVal(indicators.bollingerUpper, dp)}</div>
          <div className="text-muted-foreground">— {formatVal(indicators.bollingerMiddle, dp)}</div>
          <div className="text-green-400/70">↓ {formatVal(indicators.bollingerLower, dp)}</div>
        </div>
      </div>

      {/* ATR */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">ATR (14)</span>
        <span className="font-tabular text-xs text-amber-400">
          {formatVal(indicators.atr, dp)}
        </span>
      </div>

      {/* Stochastic */}
      <div className="indicator-row">
        <span className="text-xs text-muted-foreground">Stochastic (14)</span>
        <div className="text-right text-xs font-tabular">
          {indicators.stochastic ? (
            <>
              <span className={indicators.stochastic.k > 80 ? "text-red-400" : indicators.stochastic.k < 20 ? "text-green-400" : "text-foreground"}>
                %K {indicators.stochastic.k.toFixed(1)}
              </span>
              <span className="text-muted-foreground"> · %D {indicators.stochastic.d.toFixed(1)}</span>
            </>
          ) : "—"}
        </div>
      </div>

      {/* Trend summary */}
      <div className="pt-2 mt-1 border-t border-border/50">
        <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Trend Summary</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Short",
              bull: indicators.sma20 !== null && price > indicators.sma20,
              ref: "vs SMA20"
            },
            {
              label: "Medium",
              bull: indicators.sma50 !== null && price > indicators.sma50,
              ref: "vs SMA50"
            },
            {
              label: "Momentum",
              bull: indicators.rsi !== null && indicators.rsi > 50,
              ref: "RSI > 50"
            },
          ].map(item => (
            <div
              key={item.label}
              className={`rounded p-2 text-center text-xs ${
                item.bull
                  ? "bg-green-900/30 text-green-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              <div className="font-medium">{item.label}</div>
              <div className="opacity-70">{item.bull ? "Bullish" : "Bearish"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
