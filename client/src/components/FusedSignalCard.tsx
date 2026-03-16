/**
 * FusedSignalCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified verdict card that blends:
 *   • Local compute  (RSI, MACD, SMA, Bollinger, Stochastic)
 *   • Live news      (Yahoo Finance RSS, recency-weighted sentiment)
 *   • Structural macro factors (geopolitical / monetary / economic)
 *   • LLM deep analysis (Qwen2.5-72B, cached 15 min) — when available
 *
 * The Decision Signal and AI Analysis are NOT separate anymore.
 * This card is the single source of truth for the verdict.
 */
import type { FusedSignal } from "../../../shared/schema";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  SendHorizonal,
  Clock,
  ShieldAlert,
  Globe,
  Newspaper,
  BarChart3,
  Landmark,
  Handshake,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  Brain,
  RefreshCw,
} from "lucide-react";

// ── Action styling ────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  BUY:      { cls: "signal-buy",  icon: TrendingUp,   label: "BUY",       desc: "Favorable entry point" },
  SELL:     { cls: "signal-sell", icon: TrendingDown,  label: "SELL",      desc: "Consider reducing position" },
  HOLD:     { cls: "signal-hold", icon: Minus,         label: "HOLD",      desc: "Monitor — no clear edge" },
  SEND_NOW: { cls: "signal-send", icon: SendHorizonal, label: "SEND NOW",  desc: "Favorable rate to send money" },
  WAIT:     { cls: "signal-wait", icon: Clock,         label: "WAIT",      desc: "Rate likely to improve" },
};

const STRENGTH_ICON = {
  STRONG:   CheckCircle2,
  MODERATE: AlertCircle,
  WEAK:     Info,
};

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({
  label,
  value,
  weight,
  icon: Icon,
  colorClass,
  isLLM = false,
}: {
  label: string;
  value: number;
  weight: number;
  icon: React.ElementType;
  colorClass: string;
  isLLM?: boolean;
}) {
  // value is -100 → +100; convert to 0 → 100% bar from center
  const pct = ((value + 100) / 200) * 100;
  const isPositive = value >= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1 text-slate-500">
          <Icon size={9} className="flex-shrink-0" />
          <span className="uppercase tracking-wider font-medium">{label}</span>
          {isLLM && (
            <span className="px-1 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium border border-violet-500/20 text-[9px]">
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {value > 0 ? "+" : ""}{value}
          </span>
          <span className="text-slate-600">{weight}%</span>
        </div>
      </div>
      {/* Full-width track, fill from center */}
      <div className="w-full h-1 rounded-full bg-white/5 relative overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{
            left:  isPositive ? "50%"    : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
        {/* Center marker */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-white/20" />
      </div>
    </div>
  );
}

// ── Macro factor icon map ─────────────────────────────────────────────────────
const MACRO_CAT_ICON: Record<string, React.ElementType> = {
  GEOPOLITICAL:    Globe,
  MONETARY_POLICY: Landmark,
  ECONOMIC:        BarChart3,
  TRADE:           Handshake,
  SENTIMENT:       Activity,
};

const IMPACT_BG: Record<string, string> = {
  BULLISH:  "bg-emerald-500/10 border-emerald-500/20",
  BEARISH:  "bg-red-500/10 border-red-500/20",
  NEUTRAL:  "bg-zinc-500/10 border-zinc-500/20",
  POSITIVE: "bg-emerald-500/10 border-emerald-500/20",
  NEGATIVE: "bg-red-500/10 border-red-500/20",
};

const IMPACT_COLOR: Record<string, string> = {
  BULLISH:  "text-emerald-400",
  BEARISH:  "text-red-400",
  NEUTRAL:  "text-slate-300",
  POSITIVE: "text-emerald-400",
  NEGATIVE: "text-red-400",
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  fused: FusedSignal;
  symbol: string;
  onRefreshLLM?: () => void;
  isRefreshing?: boolean;
}

export default function FusedSignalCard({ fused, symbol, onRefreshLLM, isRefreshing }: Props) {
  const cfg = ACTION_CONFIG[fused.action];
  const Icon = cfg.icon;
  const StrengthIcon = STRENGTH_ICON[fused.strength];
  const isTransfer = symbol.includes("PHP");

  return (
    <div className={`rounded-xl p-4 ${cfg.cls}`} data-testid="fused-signal-card">

      {/* ── Verdict header ── */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 flex-shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg leading-none">{fused.label}</span>
            <span className="flex items-center gap-1 text-xs opacity-90">
              <StrengthIcon size={12} />
              {fused.strength}
            </span>
            {/* LLM badge when AI is contributing */}
            {fused.llmAvailable && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-semibold">
                <Sparkles size={8} />
                AI+
              </span>
            )}
          </div>
          <p className="text-xs opacity-75 mt-0.5 truncate">{cfg.desc}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold tabular-nums leading-none">{fused.confidence}%</div>
          <div className="text-[11px] opacity-70 mt-0.5">confidence</div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div className="w-full h-1.5 rounded-full bg-white/10 mb-3">
        <div
          className="h-full rounded-full bg-current opacity-60 transition-all duration-700"
          style={{ width: `${fused.confidence}%` }}
        />
      </div>

      {/* ── Horizon ── */}
      <div className="flex items-center gap-2 text-xs mb-4 opacity-90">
        <Clock size={12} className="flex-shrink-0" />
        <span className="font-medium">{isTransfer ? "Best window:" : "Suggested horizon:"}</span>
        <span className="truncate">{fused.horizon}</span>
      </div>

      {/* ── Score breakdown ── */}
      <div className="rounded-lg bg-black/20 p-3 mb-3 space-y-2">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <BarChart3 size={10} />
          Signal Breakdown
          <span className="ml-auto text-[9px] text-slate-600 font-normal">score · weight</span>
        </div>

        <ScoreBar
          label="Technical"
          value={fused.techScore}
          weight={fused.weights.tech}
          icon={BarChart3}
          colorClass={fused.techScore >= 0 ? "bg-emerald-400/60" : "bg-red-400/60"}
        />
        <ScoreBar
          label="News Sentiment"
          value={fused.newsSentimentScore}
          weight={fused.weights.news}
          icon={Newspaper}
          colorClass={fused.newsSentimentScore >= 0 ? "bg-sky-400/60" : "bg-amber-400/60"}
        />
        <ScoreBar
          label="Macro"
          value={fused.macroScore}
          weight={fused.weights.macro}
          icon={Globe}
          colorClass={fused.macroScore >= 0 ? "bg-teal-400/60" : "bg-orange-400/60"}
        />
        {fused.llmScore !== null && (
          <ScoreBar
            label="AI Analysis"
            value={fused.llmScore}
            weight={fused.weights.llm}
            icon={Brain}
            colorClass={fused.llmScore >= 0 ? "bg-violet-400/60" : "bg-rose-400/60"}
            isLLM
          />
        )}

        {/* Composite total */}
        <div className="pt-1.5 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Composite</span>
            <span className={`text-sm font-bold tabular-nums ${fused.compositeScore >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {fused.compositeScore > 0 ? "+" : ""}{fused.compositeScore}
            </span>
          </div>
        </div>
      </div>

      {/* ── Technical reasoning ── */}
      {fused.techReasoning.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <BarChart3 size={10} />
            Technical
          </div>
          {fused.techReasoning.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <ShieldAlert size={10} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span className="leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Macro/News reasoning ── */}
      {fused.macroReasoning.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Newspaper size={10} />
            Macro &amp; News
          </div>
          {fused.macroReasoning.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Globe size={10} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span className="leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── AI narrative + factors (when LLM available) ── */}
      {fused.llmAvailable && fused.llmSummary && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 mb-3">
          <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles size={10} />
            AI Analysis
            <span className="ml-auto flex items-center gap-1 text-slate-600 font-normal text-[9px]">
              {fused.llmModel ?? "Qwen2.5-72B"}
              {onRefreshLLM && (
                <button
                  onClick={onRefreshLLM}
                  disabled={isRefreshing}
                  className="p-0.5 rounded hover:bg-white/5 transition-colors disabled:opacity-40"
                  title="Refresh AI analysis"
                  data-testid="fused-refresh-llm"
                >
                  <RefreshCw size={9} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{fused.llmSummary}</p>

          {/* LLM gauge bars */}
          {(fused.geopoliticalRisk !== null || fused.economicMomentum !== null) && (
            <div className="mt-2 pt-2 border-t border-violet-500/10 space-y-1.5">
              {fused.economicMomentum !== null && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Economic Momentum</span>
                    <span className="text-emerald-400 font-bold">{fused.economicMomentum}</span>
                  </div>
                  <div className="w-full h-0.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-emerald-400/50" style={{ width: `${fused.economicMomentum}%` }} />
                  </div>
                </div>
              )}
              {fused.geopoliticalRisk !== null && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Geopolitical Risk</span>
                    <span className="text-rose-400 font-bold">{fused.geopoliticalRisk}</span>
                  </div>
                  <div className="w-full h-0.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-rose-400/50" style={{ width: `${fused.geopoliticalRisk}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI key factors (when LLM available) ── */}
      {fused.llmAvailable && fused.llmFactors && fused.llmFactors.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Brain size={10} />
            AI Key Factors
          </div>
          {fused.llmFactors.map((f, i) => (
            <div key={i} className={`rounded-lg border p-2 ${IMPACT_BG[f.impact] ?? "bg-zinc-500/10 border-zinc-500/20"}`}>
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold leading-tight">{f.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-bold uppercase ${IMPACT_COLOR[f.impact] ?? "text-slate-300"}`}>
                    {f.impact}
                  </span>
                  <span className="text-[10px] text-slate-500">{"●".repeat(f.weight)}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Structural macro factors ── */}
      {fused.macroFactors.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Globe size={10} />
            Macro Factors
          </div>
          {fused.macroFactors.map((f, i) => {
            const CatIcon = MACRO_CAT_ICON[f.category] ?? Globe;
            return (
              <div key={i} className={`rounded-lg border p-2.5 ${IMPACT_BG[f.impact]}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CatIcon size={10} className="opacity-70 flex-shrink-0" />
                    <span className="text-xs font-semibold leading-tight">{f.title}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-bold uppercase ${IMPACT_COLOR[f.impact]}`}>
                      {f.impact}
                    </span>
                    <span className="text-[10px] text-slate-500">{"●".repeat(f.weight)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{f.detail}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="pt-3 mt-1 border-t border-white/10 text-[10px] opacity-50 italic">
        {fused.llmAvailable
          ? `⚡ Fused: tech ${fused.weights.tech}% · news ${fused.weights.news}% · macro ${fused.weights.macro}% · AI ${fused.weights.llm}% · Not financial advice`
          : `⚡ Fused: tech ${fused.weights.tech}% · news ${fused.weights.news}% · macro ${fused.weights.macro}% · AI pending · Not financial advice`}
      </div>
    </div>
  );
}
