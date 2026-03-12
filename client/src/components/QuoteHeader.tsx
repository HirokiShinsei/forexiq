import type { TickerQuote } from "../../../shared/schema";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  quote: TickerQuote;
  label: string;
  flag?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const SYMBOL_LABELS: Record<string, { full: string; base: string; quote: string }> = {
  EUR_PHP: { full: "Euro / Philippine Peso", base: "EUR", quote: "PHP" },
  USD_PHP: { full: "US Dollar / Philippine Peso", base: "USD", quote: "PHP" },
  XAU_USD: { full: "Gold (Troy Oz) / US Dollar", base: "XAU", quote: "USD" },
};

function formatPrice(price: number, symbol: string) {
  if (symbol === "XAU_USD") return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (symbol.includes("PHP")) return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return price.toFixed(4);
}

export default function QuoteHeader({ quote, label, isLoading, onRefresh }: Props) {
  const info = SYMBOL_LABELS[quote.symbol] ?? { full: label, base: "—", quote: "—" };
  const isUp = quote.changePct >= 0;
  const isFlat = Math.abs(quote.changePct) < 0.001;
  const TrendIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const trendColor = isFlat ? "text-muted-foreground" : isUp ? "text-green-400" : "text-red-400";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {info.base}/{info.quote}
          </span>
          <span className="flex items-center gap-1">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-muted-foreground">Live</span>
          </span>
        </div>
        <h2 className="text-sm text-muted-foreground">{info.full}</h2>
        <div className="flex items-end gap-3 mt-1">
          <span className="text-3xl font-bold font-tabular text-foreground tracking-tight">
            {isLoading ? "—" : formatPrice(quote.price, quote.symbol)}
          </span>
          <div className={`flex items-center gap-1 pb-1 ${trendColor}`}>
            <TrendIcon size={14} />
            <span className="text-sm font-tabular font-medium">
              {isFlat ? "Flat" : `${isUp ? "+" : ""}${quote.changePct.toFixed(3)}%`}
            </span>
            <span className="text-xs opacity-70">
              ({isUp ? "+" : ""}{quote.change.toFixed(4)})
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="refresh-button"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
        <div className="text-xs text-muted-foreground text-right">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-muted-foreground/60">High</span>
            <span className="font-tabular text-green-400/80">{formatPrice(quote.high ?? 0, quote.symbol)}</span>
            <span className="text-muted-foreground/60">Low</span>
            <span className="font-tabular text-red-400/80">{formatPrice(quote.low ?? 0, quote.symbol)}</span>
          </div>
          {quote.updatedAt && (
            <div className="mt-1 text-muted-foreground/50">
              Updated {formatDistanceToNow(new Date(quote.updatedAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
