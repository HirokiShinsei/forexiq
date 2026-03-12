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
  BUY: {
    cls: "signal-buy",
    icon: TrendingUp,
    label: "BUY",
    desc: "Favorable entry point",
  },
  SELL: {
    cls: "signal-sell",
    icon: TrendingDown,
    label: "SELL",
    desc: "Consider reducing position",
  },
  HOLD: {
    cls: "signal-hold",
    icon: Minus,
    label: "HOLD",
    desc: "Monitor — no clear edge",
  },
  SEND_NOW: {
    cls: "signal-send",
    icon: SendHorizonal,
    label: "SEND NOW",
    desc: "Favorable rate to send money",
  },
  WAIT: {
    cls: "signal-wait",
    icon: Clock,
    label: "WAIT",
    desc: "Rate likely to improve",
  },
};

const STRENGTH_ICON = {
  STRONG: CheckCircle2,
  MODERATE: AlertCircle,
  WEAK: Info,
};

const CATEGORY_ICON: Record<MacroFactor["category"], React.ElementType> = {
  GEOPOLITICAL: Globe,
  MONETARY_POLICY: Landmark,
  ECONOMIC: BarChart3,
  TRADE: Handshake,
  SENTIMENT: Activity,
};

const CATEGORY_LABEL: Record<MacroFactor["category"], string> = {
  GEOPOLITICAL: "Geopolitical",
  MONETARY_POLICY: "Monetary Policy",
  ECONOMIC: "Economic",
  TRADE: "Trade",
  SENTIMENT: "Sentiment",
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

function ScoreBar({
  value,
  label,
  colorPos,
  colorNeg,
}: {
  value: number;
  label: string;
  colorPos: string;
  colorNeg: string;
}) {
  const abs = Math.abs(value);
  const pct = Math.min(100, abs);
  const isPos = value >= 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        {/* center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
        {/* fill from center */}
        <div
          className={`absolute top-0 bottom-0 rounded-full ${isPos ? colorPos : colorNeg}`}
          style={{
            left: isPos ? "50%" : `${50 - pct / 2}%`,
            width: `${pct / 2}%`,
          }}
        />
      </div>
      <span
        className={`text-xs font-tabular w-10 text-right ${isPos ? "text-emerald-400" : "text-red-400"}`}
      >
        {value > 0 ? "+" : ""}
        {value}
      </span>
    </div>
  );
}

function SentimentBadge({ score, label }: { score: number; label: string }) {
  const tier =
    score >= 30
      ? { text: "BULLISH", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" }
      : score <= -30
      ? { text: "BEARISH", cls: "bg-red-500/15 text-red-400 border-red-500/25" }
      : { text: "NEUTRAL", cls: "bg-zinc-500/15 text-slate-300 border-zinc-500/25" };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${tier.cls}`}>
      <span className="opacity-85">{label}</span>
      <span className="font-semibold">{tier.text}</span>
      <span className="font-tabular opacity-75">
        {score > 0 ? "+" : ""}
        {score}
      </span>
    </div>
  );
}

export default function SignalCard({ signal, symbol }: Props) {
  const cfg = ACTION_CONFIGS[signal.action];
  const Icon = cfg.icon;
  const StrengthIcon = STRENGTH_ICON[signal.strength];
  const isTransfer = symbol.includes("PHP");

  const hasMacro =
    signal.macroFactors &&
    signal.macroFactors.length > 0;

  const hasScores =
    signal.compositeScore !== undefined &&
    signal.techScore !== undefined &&
    signal.newsSentimentScore !== undefined;

  // Split reasoning into technical vs macro/news bullets
  const techBullets = signal.reasoning.filter(
    (r) =>
      r.startsWith("RSI") ||
      r.startsWith("MACD") ||
      r.startsWith("Price") ||
      r.startsWith("5-period") ||
      r.startsWith("Stochastic") ||
      r.startsWith("Bollinger")
  );
  const macroBullets = signal.reasoning.filter(
    (r) => !techBullets.includes(r)
  );

  return (
    <div className={`rounded-lg p-4 ${cfg.cls}`} data-testid="signal-card">
      {/* ── Header: action + confidence ── */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
          <Icon size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg font-tabular">{signal.label}</span>
            <span className="flex items-center gap-1 text-xs opacity-90">
              <StrengthIcon size={12} />
              {signal.strength}
            </span>
          </div>
          <p className="text-xs opacity-85">{cfg.desc}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold font-tabular">{signal.confidence}%</div>
          <div className="text-xs opacity-80">confidence</div>
        </div>
      </div>

      {/* ── Confidence bar ── */}
      <div className="w-full h-1.5 rounded-full bg-white/10 mb-3">
        <div
          className="h-full rounded-full bg-current opacity-60 transition-all duration-700"
          style={{ width: `${signal.confidence}%` }}
        />
      </div>

      {/* ── Composite score panel ── */}
      {hasScores && (
        <div className="bg-black/20 rounded-md p-3 mb-3 space-y-2">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity size={10} />
            Signal Scores
          </div>
          <ScoreBar
            value={signal.compositeScore!}
            label="Composite"
            colorPos="bg-emerald-400"
            colorNeg="bg-red-400"
          />
          <ScoreBar
            value={signal.techScore!}
            label="Technical"
            colorPos="bg-sky-400"
            colorNeg="bg-amber-400"
          />
          <ScoreBar
            value={signal.newsSentimentScore!}
            label="News/Macro"
            colorPos="bg-violet-400"
            colorNeg="bg-orange-400"
          />
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <SentimentBadge
              score={signal.compositeScore!}
              label="Composite"
            />
            <SentimentBadge
              score={signal.newsSentimentScore!}
              label="News"
            />
          </div>
          <p className="text-xs text-slate-500 pt-0.5">
            Weighted: 60% Technical · 40% News &amp; Macro
          </p>
        </div>
      )}

      {/* ── Horizon ── */}
      <div className="flex items-center gap-2 text-xs mb-3">
        <Clock size={12} />
        <span className="font-medium">
          {isTransfer ? "Best window:" : "Suggested horizon:"}
        </span>
        <span>{signal.horizon}</span>
      </div>

      {/* ── Technical reasoning ── */}
      {techBullets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <BarChart3 size={10} />
            Technical
          </div>
          {techBullets.slice(0, 3).map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <ShieldAlert size={10} className="mt-0.5 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Macro/News reasoning ── */}
      {macroBullets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Newspaper size={10} />
            Macro &amp; News
          </div>
          {macroBullets.slice(0, 5).map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Globe size={10} className="mt-0.5 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Macro factors list ── */}
      {hasMacro && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe size={10} />
            Macro Factors
          </div>
          {signal.macroFactors!.map((factor, i) => {
            const CatIcon = CATEGORY_ICON[factor.category];
            return (
              <div
                key={i}
                className={`rounded border p-2 ${IMPACT_BG[factor.impact]}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <CatIcon size={10} className="opacity-75" />
                    <span className="text-xs font-semibold">
                      {factor.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">
                      {CATEGORY_LABEL[factor.category]}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${IMPACT_COLOR[factor.impact]}`}
                    >
                      {factor.impact}
                    </span>
                    <span className="text-xs text-slate-400">
                      {"●".repeat(factor.weight)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{factor.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
