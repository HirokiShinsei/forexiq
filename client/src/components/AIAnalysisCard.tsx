import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AIAnalysisReport, AIAnalysisFactor } from "../../../shared/schema";
import { apiRequest } from "../lib/queryClient";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  ShieldAlert,
  BarChart3,
  Globe,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface Props {
  symbol: string;
}

// ── Verdict styling ─────────────────────────────────────────────────────────
const VERDICT_CONFIG: Record<string, {
  cls: string;
  icon: React.ElementType;
  label: string;
}> = {
  "SEND NOW": { cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", icon: TrendingUp,    label: "SEND NOW" },
  "WAIT":     { cls: "bg-amber-500/15 border-amber-500/30 text-amber-300",       icon: Clock,         label: "WAIT" },
  "BUY":      { cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300", icon: TrendingUp,    label: "BUY" },
  "SELL":     { cls: "bg-red-500/15 border-red-500/30 text-red-300",             icon: TrendingDown,  label: "SELL" },
  "HOLD":     { cls: "bg-slate-500/15 border-slate-500/30 text-slate-300",       icon: Minus,         label: "HOLD" },
};

const OUTLOOK_COLOR = {
  BULLISH: "text-emerald-400",
  BEARISH: "text-red-400",
  NEUTRAL: "text-slate-300",
};

const IMPACT_CONFIG: Record<AIAnalysisFactor["impact"], { color: string; bg: string }> = {
  POSITIVE: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  NEGATIVE: { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  NEUTRAL:  { color: "text-slate-400",   bg: "bg-slate-500/10 border-slate-500/20" },
};

// ── Gauge bar ────────────────────────────────────────────────────────────────
function GaugeBar({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-500 uppercase tracking-wider font-medium">{label}</span>
        <span className={`font-bold tabular-nums ${colorClass}`}>{value}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass.replace("text-", "bg-")}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function AISkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 animate-pulse" data-testid="ai-analysis-skeleton">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded bg-white/10" />
        <div className="h-3 w-32 rounded bg-white/10" />
      </div>
      <div className="h-16 rounded-lg bg-white/5" />
      <div className="h-10 rounded-lg bg-white/5" />
      <div className="space-y-2">
        <div className="h-8 rounded bg-white/5" />
        <div className="h-8 rounded bg-white/5" />
        <div className="h-8 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AIAnalysisCard({ symbol }: Props) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<AIAnalysisReport>({
    queryKey: ["/api/llm-analysis", symbol],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/llm-analysis/${symbol}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "AI analysis failed");
      }
      return res.json();
    },
    staleTime: 14 * 60 * 1000,   // 14 min — slightly under 15-min server cache
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <AISkeleton />;

  // Token not configured or unavailable — show graceful message
  if (error) {
    const msg = (error as Error).message ?? "";
    const isUnconfigured = msg.includes("HF_API_TOKEN") || msg.includes("unavailable");
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4" data-testid="ai-analysis-error">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={13} className="text-muted-foreground/60" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            AI Analysis
          </span>
        </div>
        <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            {isUnconfigured
              ? "AI analysis requires the HF_API_TOKEN environment variable to be set on Render."
              : `Unable to load AI analysis: ${msg}`}
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const verdictCfg = VERDICT_CONFIG[data.verdict] ?? VERDICT_CONFIG["HOLD"];
  const VerdictIcon = verdictCfg.icon;

  const updatedStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden" data-testid="ai-analysis-card">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-violet-400" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            AI Deep Analysis
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium border border-violet-500/20">
            Qwen 2.5 · 72B
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updatedStr && (
            <span className="text-[10px] text-muted-foreground/40 tabular-nums hidden sm:inline">
              {updatedStr}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Regenerate analysis"
            data-testid="ai-refresh-btn"
          >
            <RefreshCw size={11} className={`text-muted-foreground/60 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            data-testid="ai-toggle-btn"
          >
            {expanded
              ? <ChevronUp size={13} className="text-muted-foreground/60" />
              : <ChevronDown size={13} className="text-muted-foreground/60" />}
          </button>
        </div>
      </div>

      {/* ── Body — collapsible ── */}
      {expanded && (
        <div className="p-4 space-y-4">

          {/* Verdict + confidence row */}
          <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${verdictCfg.cls}`}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 flex-shrink-0">
              <VerdictIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base leading-none">{data.verdict}</span>
                <span className={`text-xs font-medium ${OUTLOOK_COLOR[data.outlook]}`}>
                  {data.outlook}
                </span>
              </div>
              <p className="text-[11px] opacity-70 mt-0.5 truncate">{data.horizon}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-bold tabular-nums leading-none">{data.confidence}%</div>
              <div className="text-[10px] opacity-60 mt-0.5">confidence</div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="w-full h-1 rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-violet-400/60 transition-all duration-700"
              style={{ width: `${data.confidence}%` }}
            />
          </div>

          {/* Summary narrative */}
          <p className="text-xs text-muted-foreground leading-relaxed">{data.summary}</p>

          {/* Sentiment gauges */}
          <div className="space-y-2 pt-1">
            <GaugeBar value={data.newsSentiment}     label="News Sentiment"     colorClass="text-sky-400" />
            <GaugeBar value={data.economicMomentum}  label="Economic Momentum"  colorClass="text-emerald-400" />
            <GaugeBar value={data.geopoliticalRisk}  label="Geopolitical Risk"   colorClass="text-rose-400" />
          </div>

          {/* Key factors */}
          {data.factors.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={10} />
                Key Factors
              </div>
              {data.factors.map((factor, i) => {
                const ic = IMPACT_CONFIG[factor.impact];
                return (
                  <div key={i} className={`rounded-lg border p-2.5 ${ic.bg}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold leading-tight">{factor.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-bold uppercase ${ic.color}`}>
                          {factor.impact}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {"●".repeat(factor.weight)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{factor.detail}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Disclaimer */}
          <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground/40 italic leading-relaxed">
            ⚠ {data.disclaimer}
          </div>

        </div>
      )}
    </div>
  );
}
