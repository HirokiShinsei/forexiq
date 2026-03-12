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
    cls: "bg-green-900/30 text-green-400 border-green-800/40",
    dot: "bg-green-400",
  },
  BEARISH: {
    Icon: TrendingDown,
    cls: "bg-red-900/30 text-red-400 border-red-800/40",
    dot: "bg-red-400",
  },
  NEUTRAL: {
    Icon: Minus,
    cls: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
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
        No recent news found.
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
            className="rounded-lg border border-border/50 bg-card p-3 hover:border-border transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className={`flex-shrink-0 mt-0.5 rounded px-1.5 py-0.5 border text-xs flex items-center gap-1 ${cfg.cls}`}>
                <Icon size={10} />
                <span className="font-medium">{item.sentiment}</span>
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2 flex gap-1"
                >
                  {item.title}
                  <ExternalLink size={11} className="flex-shrink-0 mt-0.5 opacity-50" />
                </a>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium">{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.publishedAt)}</span>
                  {item.relevance.length > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex gap-1">
                        {item.relevance.map(r => (
                          <span
                            key={r}
                            className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
