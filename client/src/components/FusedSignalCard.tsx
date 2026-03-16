/**
 * FusedSignalCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified verdict — blends local compute (tech + news + macro) with
 * LLM deep analysis (Qwen2.5-72B, 15-min cache) when available.
 *
 * Layout:
 *   1. Verdict header   — action, strength, confidence %, horizon
 *   2. Confidence bar
 *   3. AI Overview      — narrative + future sentiment + statistics from LLM
 *                         (or a "waiting" state with animated progress bar)
 *   4. Technical bullets
 *   5. Macro/News bullets
 *   6. AI Key Factors
 *   7. Structural Macro Factors
 *   8. Disclaimer only (no weight footer)
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
  Cpu,
  TrendingUp as ArrowUp,
  TrendingDown as ArrowDown,
} from "lucide-react";

// ── Action styling ────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  BUY:      { cls: "signal-buy",  icon: TrendingUp,    label: "BUY",       desc: "Favorable entry point" },
  SELL:     { cls: "signal-sell", icon: TrendingDown,   label: "SELL",      desc: "Consider reducing position" },
  HOLD:     { cls: "signal-hold", icon: Minus,          label: "HOLD",      desc: "Monitor — no clear edge" },
  SEND_NOW: { cls: "signal-send", icon: SendHorizonal,  label: "SEND NOW",  desc: "Favorable rate to send money" },
  WAIT:     { cls: "signal-wait", icon: Clock,          label: "WAIT",      desc: "Rate likely to improve" },
};

const STRENGTH_ICON = {
  STRONG:   CheckCircle2,
  MODERATE: AlertCircle,
  WEAK:     Info,
};

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

// ── Sentiment stat pill ───────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  unit = "",
  direction,
}: {
  label: string;
  value: number;
  unit?: string;
  direction?: "up" | "down" | "neutral";
}) {
  const colorCls =
    direction === "up"   ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/8" :
    direction === "down" ? "text-red-400 border-red-500/25 bg-red-500/8" :
                           "text-slate-300 border-white/10 bg-white/5";

  const DirIcon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : null;

  return (
    <div className={`flex flex-col items-center rounded-lg border px-2.5 py-2 ${colorCls}`}>
      <div className="flex items-center gap-1">
        {DirIcon && <DirIcon size={9} className="opacity-80" />}
        <span className="text-base font-bold tabular-nums leading-none">
          {value}{unit}
        </span>
      </div>
      <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── AI waiting state ──────────────────────────────────────────────────────────
function AIWaitingState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
          <Brain size={10} />
          AI Deep Analysis
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] text-violet-400 border border-violet-500/25 hover:bg-violet-500/10 transition-colors"
            data-testid="fused-refresh-llm"
          >
            <RefreshCw size={9} />
            Generate
          </button>
        )}
      </div>

      {/* Animated waiting bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Waiting for AI response…</span>
          <span className="text-violet-400/70 tabular-nums">—%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500/40 animate-[shimmer_2s_ease-in-out_infinite]"
               style={{ width: "60%", animation: "pulse 2s ease-in-out infinite" }} />
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        AI analysis runs every 15 minutes. Hit "Generate" to request a fresh analysis now.
        The verdict above reflects local compute signals only until AI responds.
      </p>
    </div>
  );
}

// ── AI loading state (request in flight) ──────────────────────────────────────
function AILoadingState() {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
          <Brain size={10} />
          AI Deep Analysis
        </div>
        <span className="text-[9px] text-violet-400/60 flex items-center gap-1">
          <Cpu size={9} className="animate-pulse" />
          Inferencing…
        </span>
      </div>

      {/* Indeterminate progress bar */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Qwen 2.5 · 72B generating report</span>
          <span className="text-violet-400 tabular-nums font-medium animate-pulse">···</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          {/* Sliding shimmer bar — pure CSS, no localStorage */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600/0 via-violet-500/70 to-violet-600/0"
            style={{
              width: "40%",
              animation: "slide-shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {["Reading market context & news…", "Scoring geopolitical & macro factors…", "Synthesising verdict & factors…"].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
            <div
              className="w-1 h-1 rounded-full bg-violet-400/60 flex-shrink-0"
              style={{ animationDelay: `${i * 0.4}s`, animation: "pulse 1.5s ease-in-out infinite" }}
            />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  fused: FusedSignal;
  symbol: string;
  llmLoading?: boolean;    // LLM request currently in-flight
  onRefreshLLM?: () => void;
  onRefreshLocal?: () => void;
  isFetchingLocal?: boolean;
}

export default function FusedSignalCard({
  fused,
  symbol,
  llmLoading = false,
  onRefreshLLM,
  onRefreshLocal,
  isFetchingLocal = false,
}: Props) {
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
            {fused.llmAvailable && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-semibold">
                <Sparkles size={8} />
                AI+
              </span>
            )}
          </div>
          <p className="text-xs opacity-75 mt-0.5 truncate">{cfg.desc}</p>
        </div>
        {/* Refresh local data */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums leading-none">{fused.confidence}%</div>
            <div className="text-[11px] opacity-70">confidence</div>
          </div>
          {onRefreshLocal && (
            <button
              onClick={onRefreshLocal}
              disabled={isFetchingLocal}
              title="Refresh market data"
              className="flex items-center gap-1 text-[9px] opacity-60 hover:opacity-90 transition-opacity disabled:opacity-30"
              data-testid="fused-refresh-local"
            >
              <RefreshCw size={9} className={isFetchingLocal ? "animate-spin" : ""} />
              <span>Refresh data</span>
            </button>
          )}
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

      {/* ══════════════════════════════════════════════════════════════
          AI OVERVIEW — replaces score breakdown
          Shows: narrative, future sentiment, stat pills
      ══════════════════════════════════════════════════════════════ */}
      {llmLoading ? (
        <div className="mb-3"><AILoadingState /></div>
      ) : fused.llmAvailable && fused.llmSummary ? (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 mb-3">
          {/* Sub-header with refresh */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
              <Brain size={10} />
              AI Deep Analysis
              <span className="text-[9px] text-slate-600 font-normal normal-case tracking-normal">
                · {fused.llmModel ?? "Qwen2.5-72B"}
              </span>
            </div>
            {onRefreshLLM && (
              <button
                onClick={onRefreshLLM}
                title="Regenerate AI analysis"
                className="p-1 rounded hover:bg-white/5 transition-colors"
                data-testid="fused-refresh-llm"
              >
                <RefreshCw size={10} className="text-violet-400/60 hover:text-violet-300" />
              </button>
            )}
          </div>

          {/* Narrative */}
          <p className="text-xs text-slate-300 leading-relaxed mb-3">{fused.llmSummary}</p>

          {/* Future sentiment + stat pills */}
          {(fused.geopoliticalRisk !== null || fused.economicMomentum !== null) && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {fused.economicMomentum !== null && (
                  <StatPill
                    label="Economic Momentum"
                    value={fused.economicMomentum}
                    unit=""
                    direction={
                      fused.economicMomentum >= 60 ? "up" :
                      fused.economicMomentum <= 40 ? "down" : "neutral"
                    }
                  />
                )}
                {fused.geopoliticalRisk !== null && (
                  <StatPill
                    label="Geopolitical Risk"
                    value={fused.geopoliticalRisk}
                    unit=""
                    direction={
                      fused.geopoliticalRisk >= 60 ? "down" :
                      fused.geopoliticalRisk <= 40 ? "up" : "neutral"
                    }
                  />
                )}
                {/* AI confidence as a stat */}
                <StatPill
                  label="AI Confidence"
                  value={fused.confidence}
                  unit="%"
                  direction={
                    fused.confidence >= 65 ? "up" :
                    fused.confidence <= 40 ? "down" : "neutral"
                  }
                />
              </div>

              {/* Horizon gauge bars */}
              <div className="space-y-1.5 pt-2 border-t border-violet-500/10">
                {fused.economicMomentum !== null && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Economic Momentum</span>
                      <span className="text-emerald-400 font-bold tabular-nums">{fused.economicMomentum}/100</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-emerald-400/50 transition-all duration-700"
                        style={{ width: `${fused.economicMomentum}%` }}
                      />
                    </div>
                  </div>
                )}
                {fused.geopoliticalRisk !== null && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Geopolitical Risk</span>
                      <span className="text-rose-400 font-bold tabular-nums">{fused.geopoliticalRisk}/100</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-rose-400/50 transition-all duration-700"
                        style={{ width: `${fused.geopoliticalRisk}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <AIWaitingState onRefresh={onRefreshLLM} />
        </div>
      )}

      {/* ── Technical bullets ── */}
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

      {/* ── Macro/News bullets ── */}
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

      {/* ── AI Key Factors ── */}
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

      {/* ── Structural Macro Factors ── */}
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

      {/* ── Disclaimer only ── */}
      <div className="pt-3 mt-2 border-t border-white/10 text-[10px] opacity-40 italic">
        ⚠ For informational purposes only. Not financial advice.
      </div>
    </div>
  );
}
