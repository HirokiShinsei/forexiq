import { useState, useRef, useEffect } from "react";
import { Search, X, TrendingUp, Newspaper, ExternalLink } from "lucide-react";
import { apiRequest } from "../lib/queryClient";

interface SearchResult {
  query: string;
  symbols: Array<{
    symbol: string;
    label: string;
    price: number | null;
    change: number | null;
    changePct: number | null;
    signal: string;
    action: string;
  }>;
  news: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    relevance: string[];
  }>;
  allNews: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    relevance: string[];
  }>;
}

const SENTIMENT_STYLE = {
  BULLISH: "text-emerald-400",
  BEARISH: "text-red-400",
  NEUTRAL: "text-zinc-400",
};

interface Props {
  onNavigate: (symbol: string) => void;
}

export default function SearchBar({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd+K to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleInput(val: string) {
    // Sanitize: strip any HTML/script characters
    const sanitized = val.replace(/[<>"'`]/g, "").slice(0, 100);
    setQuery(sanitized);
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (sanitized.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(sanitized.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResult = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setError("Search temporarily unavailable");
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function clearSearch() {
    setQuery("");
    setResults(null);
    setOpen(false);
    setError("");
    inputRef.current?.focus();
  }

  function handleSymbolClick(symbol: string) {
    onNavigate(symbol);
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  const hasResults = results && (results.symbols.length > 0 || results.news.length > 0 || results.allNews.length > 0);
  const displayNews = results
    ? (results.news.length > 0 ? results.news : results.allNews).slice(0, 5)
    : [];

  return (
    <div ref={containerRef} className="relative w-full max-w-xs" data-testid="search-container">
      {/* Input */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          spellCheck="false"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search forex, gold, news…"
          aria-label="Search forex, gold, and news"
          data-testid="search-input"
          className="w-full h-8 pl-7 pr-7 text-xs rounded-md bg-secondary border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/40 transition-colors"
        />
        {query ? (
          <button
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} />
          </button>
        ) : (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xs hidden sm:inline pointer-events-none">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown results */}
      {open && query.length >= 2 && (
        <div
          className="absolute top-full mt-1 left-0 w-80 max-h-96 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-xl z-50 text-sm"
          role="listbox"
          aria-label="Search results"
        >
          {loading && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              Searching…
            </div>
          )}

          {error && (
            <div className="px-3 py-3 text-xs text-red-400 text-center">{error}</div>
          )}

          {!loading && !error && !hasResults && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No results found for "{query}"
            </div>
          )}

          {!loading && !error && results && results.symbols.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                <TrendingUp size={10} />
                Matched Pairs
              </div>
              {results.symbols.map(sym => (
                <button
                  key={sym.symbol}
                  role="option"
                  aria-selected="false"
                  onClick={() => handleSymbolClick(sym.symbol)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                  data-testid={`search-result-symbol-${sym.symbol}`}
                >
                  <span className="font-semibold text-foreground text-xs">{sym.label}</span>
                  <span className="flex items-center gap-2">
                    {sym.price !== null && (
                      <span className="font-tabular text-xs text-foreground">
                        {sym.price < 10
                          ? sym.price.toFixed(4)
                          : sym.price < 1000
                          ? sym.price.toFixed(2)
                          : sym.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className="text-xs text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                      View →
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && displayNews.length > 0 && (
            <div className="p-2 border-t border-border/40">
              <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider px-2 py-1.5 flex items-center gap-1.5">
                <Newspaper size={10} />
                Related News
              </div>
              {displayNews.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="option"
                  aria-selected="false"
                  className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-secondary transition-colors group"
                  data-testid={`search-result-news-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground/50">{item.source}</span>
                      <span className={`text-xs font-medium ${SENTIMENT_STYLE[item.sentiment]}`}>
                        {item.sentiment}
                      </span>
                      {item.relevance.slice(0, 2).map(r => (
                        <span key={r} className="text-xs text-muted-foreground/40">{r}</span>
                      ))}
                    </div>
                  </div>
                  <ExternalLink size={10} className="text-muted-foreground/40 mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
