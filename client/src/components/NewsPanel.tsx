import type { NewsItem } from "../../../shared/schema";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  news: NewsItem[];
  filterSymbol?: string;
}

const SENTIMENT_CONFIG = {
  BULLISH: {
    Icon: TrendingUp,
    cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  },
  BEARISH: {
    Icon: TrendingDown,
    cls: "bg-red-900/30 text-red-400 border-red-800/40",
  },
  NEUTRAL: {
    Icon: Minus,
    cls: "bg-muted text-muted-foreground border-border",
  },
};

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export default function NewsPanel({ news, filterSymbol }: Props) {
  const displaySymbol = filterSymbol?.replace("_", "/");
  const filtered = filterSymbol
    ? news.filter(n => n.relevance.includes(displaySymbol!))
    : news;

  if (filtered.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No recent news found for this pair.
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="news-panel">
      {filtered.map(item => {
        const cfg = SENTIMENT_CONFIG[item.sentiment];
        const { Icon } = cfg;
        return (
          <div
            key={item.id}
            className="rounded-xl border border-border/50 bg-card/60 p-3 hover:border-border/80 transition-colors"
          >
            {/* Sentiment badge + time — top row */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border text-[10px] font-semibold flex-shrink-0 ${cfg.cls}`}>
                <Icon size={9} />
                {item.sentiment}
              </span>
              <span className="text-[11px] text-muted-foreground/60 truncate">
                {item.source} · {timeAgo(item.publishedAt)}
              </span>
            </div>

            {/* Title — full width, wraps naturally */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <p className="text-sm font-medium leading-snug text-foreground/90 group-hover:text-primary transition-colors line-clamp-3">
                {item.title}
                <ExternalLink
                  size={10}
                  className="inline ml-1 opacity-40 group-hover:opacity-70 transition-opacity flex-shrink-0 -translate-y-px"
                />
              </p>
            </a>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
