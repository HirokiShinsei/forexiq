import type { Signal, MacroFactor } from "../../../shared/schema";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  SendHorizonal,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Info,
  Newspaper,
  Globe,
  Landmark,
  BarChart3,
  TrendingUp as TrendUp,
  Handshake,
  Activity,
} from "lucide-react";

interface Props {
  signal: Signal;
  symbol: string;
}

const ACTION_CONFIGS = {
  BUY:      { cls: "signal-buy",  icon: TrendingUp,    label: "BUY",      desc: "Favorable entry point" },
  SELL:     { cls: "signal-sell", icon: TrendingDown,   label: "SELL",     desc: "Consider reducing position" },
  HOLD:     { cls: "signal-hold", icon: Minus,          label: "HOLD",     desc: "Monitor — no clear edge" },
  SEND_NOW: { cls: "signal-send", icon: SendHorizonal,  label: "SEND NOW", desc: "Favorable rate to send money" },
  WAIT:     { cls: "signal-wait", icon: Clock,          label: "WAIT",     desc: "Rate likely to improve" },
};

const STRENGTH_ICON = {
  STRONG:   CheckCircle2,
  MODERATE: AlertCircle,
  WEAK:     Info,
};

const CATEGORY_ICON: Record<MacroFactor["category"], React.ElementType> = {
  GEOPOLITICAL:    Globe,
  MONETARY_POLICY: Landmark,
  ECONOMIC:        BarChart3,
  TRADE:           Handshake,
  SENTIMENT:       Activity,
};

const CATEGORY_LABEL: Record<MacroFactor["category"], string> = {
  GEOPOLITICAL:    "Geopolitical",
  MONETARY_POLICY: "Monetary Policy",
  ECONOMIC:        "Economic",
  TRADE:           "Trade",
  SENTIMENT:       "Sentiment",
};

const IMPACT_COLOR: Record<MacroFactor["impact"], string> = {
  BULLISH: "text-emerald-400",
  BEARISH: "text-red-400",
  NEUTRAL: "text-slate-300",
};

const IMPACT_BG: Record<MacroFactor["impact"], string> = {
  BULLISH: "bg-emerald-500/10 border-emerald-500/20",
  BEARISH: "bg-red-500/10 border-red-500/20",
  NEUTRAL: "bg-zinc-500/10 border-zinc-500/20",
};

export default function SignalCard({ signal, symbol }: Props) {
  const cfg = ACTION_CONFIGS[signal.action];
  const Icon = cfg.icon;
  const StrengthIcon = STRENGTH_ICON[signal.strength];
  const isTransfer = symbol.includes("PHP");

  const hasMacro = signal.macroFactors && signal.macroFactors.length > 0;

  // Split reasoning into technical vs macro/news bullets
  const techBullets = signal.reasoning.filter(r =>
    r.startsWith("RSI") ||
    r.startsWith("MACD") ||
    r.startsWith("Price") ||
    r.startsWith("5-period") ||
    r.startsWith("Stochastic") ||
    r.startsWith("Bollinger")
  );
  const macroBullets = signal.reasoning.filter(r => !techBullets.includes(r));

  return (
    <div className={`rounded-xl p-4 ${cfg.cls}`} data-testid="signal-card">

      {/* ── Header: action icon + label + confidence ── */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 flex-shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg leading-none">{signal.label}</span>
            <span className="flex items-center gap-1 text-xs opacity-90">
              <StrengthIcon size={12} />
              {signal.strength}
            </span>
          </div>
          <p className="text-xs opacity-75 mt-0.5 truncate">{cfg.desc}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold tabular-nums leading-none">{signal.confidence}%</div>
          <div className="text-[11px] opacity-70 mt-0.5">confidence</div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div className="w-full h-1.5 rounded-full bg-white/10 mb-3">
        <div
          className="h-full rounded-full bg-current opacity-60 transition-all duration-700"
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      {/* ── Horizon ── */}
      <div className="flex items-center gap-2 text-xs mb-3 opacity-90">
        <Clock size={12} className="flex-shrink-0" />
        <span className="font-medium">{isTransfer ? "Best window:" : "Suggested horizon:"}</span>
        <span className="truncate">{signal.horizon}</span>
      </div>

      {/* ── Technical reasoning ── */}
      {techBullets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <BarChart3 size={10} />
            Technical
          </div>
          {techBullets.slice(0, 3).map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <ShieldAlert size={10} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span className="leading-relaxed">{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Macro/News reasoning ── */}
      {macroBullets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Newspaper size={10} />
            Macro &amp; News
          </div>
          {macroBullets.slice(0, 5).map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Globe size={10} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span className="leading-relaxed">{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Macro factors ── */}
      {hasMacro && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe size={10} />
            Macro Factors
          </div>
          {signal.macroFactors!.map((factor, i) => {
            const CatIcon = CATEGORY_ICON[factor.category];
            return (
              <div key={i} className={`rounded-lg border p-2.5 ${IMPACT_BG[factor.impact]}`}>
                {/* Factor title row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CatIcon size={10} className="opacity-70 flex-shrink-0" />
                    <span className="text-xs font-semibold leading-tight">{factor.title}</span>
                  </div>
                  {/* Impact badge — wrap on narrow screens */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-bold uppercase ${IMPACT_COLOR[factor.impact]}`}>
                      {factor.impact}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {"●".repeat(factor.weight)}
                    </span>
                  </div>
                </div>
                {/* Category label */}
                <div className="text-[10px] text-slate-500 mb-1">{CATEGORY_LABEL[factor.category]}</div>
                {/* Detail text */}
                <p className="text-xs text-slate-300 leading-relaxed">{factor.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
