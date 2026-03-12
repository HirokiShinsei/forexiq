import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CandlestickChart from "../components/charts/CandlestickChart";
import RSIChart from "../components/charts/RSIChart";
import MACDChart from "../components/charts/MACDChart";
import SignalCard from "../components/SignalCard";
import IndicatorsPanel from "../components/IndicatorsPanel";
import NewsPanel from "../components/NewsPanel";
import QuoteHeader from "../components/QuoteHeader";
import SearchBar from "../components/SearchBar";
import type { MarketData } from "../../../shared/schema";
import { AlertCircle, BarChart2, Newspaper, Activity, TrendingUp } from "lucide-react";
import { apiRequest } from "../lib/queryClient";

const SYMBOLS = [
  { id: "EUR_PHP", label: "EUR/PHP", emoji: "🇪🇺🇵🇭" },
  { id: "USD_PHP", label: "USD/PHP", emoji: "🇺🇸🇵🇭" },
  { id: "AED_PHP", label: "AED/PHP", emoji: "🇦🇪🇵🇭" },
  { id: "XAU_USD", label: "GOLD/USD", emoji: "🏅" },
];

function useMarketData(symbol: string) {
  return useQuery<MarketData>({
    queryKey: ["/api/market", symbol],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/market/${symbol}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

// Market context copy per symbol
const MARKET_CONTEXT: Record<string, { isTransfer: boolean; paras: [string, string] }> = {
  EUR_PHP: {
    isTransfer: true,
    paras: [
      "A <strong>higher</strong> EUR/PHP rate means <strong>more Philippine Pesos</strong> per Euro sent — favorable for OFWs in Europe sending remittances.",
      "The <strong>SEND NOW</strong> signal triggers when technical momentum and macro factors suggest the rate is near a local high. <strong>WAIT</strong> appears when the rate may improve further.",
    ],
  },
  USD_PHP: {
    isTransfer: true,
    paras: [
      "A <strong>higher</strong> USD/PHP rate means <strong>more Philippine Pesos</strong> per US Dollar sent — favorable for OFWs in the US sending remittances.",
      "The <strong>SEND NOW</strong> signal triggers when conditions are optimal for transfers. Monitor <strong>Fed rate decisions</strong> and <strong>Iran-US tensions</strong> — both directly impact this pair.",
    ],
  },
  AED_PHP: {
    isTransfer: true,
    paras: [
      "The UAE Dirham is <strong>pegged to the USD</strong> at 3.6725. AED/PHP closely follows USD/PHP movements. A <strong>higher</strong> AED/PHP rate means <strong>more Philippine Pesos</strong> per Dirham — favorable for OFWs in the UAE.",
      "Over <strong>700,000 Filipinos</strong> work in the UAE. This is one of the largest OFW remittance corridors. The <strong>SEND NOW</strong> signal is particularly relevant for Dubai, Abu Dhabi, and Sharjah-based workers.",
    ],
  },
  XAU_USD: {
    isTransfer: false,
    paras: [
      "Gold (XAU/USD) is driven by <strong>safe-haven demand</strong>, USD strength, inflation expectations, geopolitical tensions, and central bank buying.",
      "<strong>BUY</strong> signals suggest gold may rally. <strong>SELL</strong> signals suggest a pullback. Always consider macro factors — the Iran-US conflict and BNP/JPMorgan's $6,000 target are key drivers.",
    ],
  },
};

function MarketPanel({ symbol }: { symbol: string }) {
  const { data, isLoading, error, refetch, isFetching } = useMarketData(symbol);
  const [subTab, setSubTab] = useState<"chart" | "news">("chart");

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load market data. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const ctx = MARKET_CONTEXT[symbol] ?? MARKET_CONTEXT["XAU_USD"];

  return (
    <div className="p-4 space-y-4">
      <QuoteHeader
        quote={data.quote}
        label={symbol.replace("_", "/")}
        isLoading={isFetching}
        onRefresh={() => refetch()}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Chart + Sub-indicators */}
        <div className="xl:col-span-2 space-y-0">
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setSubTab("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                subTab === "chart"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-testid="tab-chart"
            >
              <BarChart2 size={12} /> Chart &amp; Indicators
            </button>
            <button
              onClick={() => setSubTab("news")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                subTab === "news"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-testid="tab-news"
            >
              <Newspaper size={12} /> News Feed
              {data.news.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {data.news.length}
                </span>
              )}
            </button>
          </div>

          {subTab === "chart" ? (
            <>
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp size={12} />
                    <span className="font-medium">Candlestick — 90 Day</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> SMA20</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded" /> SMA50</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded border-dashed" /> BB</span>
                  </div>
                </div>
                <CandlestickChart
                  candles={data.candles}
                  indicators={data.indicators}
                  symbol={symbol}
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-card overflow-hidden mt-2">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 text-xs text-muted-foreground">
                  <Activity size={12} />
                  <span className="font-medium">RSI (14)</span>
                  <span className="ml-auto">
                    {data.indicators.rsi !== null ? (
                      <span className={
                        data.indicators.rsi > 70 ? "text-red-400" :
                        data.indicators.rsi < 30 ? "text-green-400" :
                        "text-amber-400"
                      }>
                        {data.indicators.rsi.toFixed(1)}
                        {data.indicators.rsi > 70 ? " · Overbought" :
                         data.indicators.rsi < 30 ? " · Oversold" : " · Neutral"}
                      </span>
                    ) : "—"}
                  </span>
                </div>
                <RSIChart candles={data.candles} />
              </div>

              <div className="rounded-lg border border-border/60 bg-card overflow-hidden mt-2">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 text-xs text-muted-foreground">
                  <Activity size={12} />
                  <span className="font-medium">MACD (12,26,9)</span>
                  <span className="ml-auto">
                    {data.indicators.macd ? (
                      <span className={data.indicators.macd.histogram > 0 ? "text-green-400" : "text-red-400"}>
                        Histogram: {data.indicators.macd.histogram > 0 ? "+" : ""}{data.indicators.macd.histogram.toFixed(5)}
                      </span>
                    ) : "—"}
                  </span>
                </div>
                <MACDChart candles={data.candles} />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper size={14} className="text-muted-foreground" />
                <h3 className="text-sm font-medium">Market News</h3>
                <span className="text-xs text-muted-foreground">
                  — events affecting {symbol.replace("_", "/")}
                </span>
              </div>
              <ScrollArea className="h-[520px] pr-2">
                <NewsPanel news={data.news} filterSymbol={symbol} />
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Right: Signal + Indicators */}
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity size={11} />
              Decision Signal {ctx.isTransfer ? "— for OFW / Remittance" : "— for Traders"}
            </div>
            <SignalCard signal={data.signal} symbol={symbol} />
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart2 size={11} />
              Technical Indicators
            </div>
            <IndicatorsPanel indicators={data.indicators} price={data.quote.price} />
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Market Context
            </div>
            <div className="space-y-2 text-xs">
              <p
                className="text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: ctx.paras[0] }}
              />
              <p
                className="text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: ctx.paras[1] }}
              />
              <div className="pt-2 mt-1 border-t border-border/50 text-muted-foreground/60 text-xs italic">
                ⚠ For informational purposes only. Not financial advice.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("EUR_PHP");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-12 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg
              aria-label="ForexIQ Logo"
              viewBox="0 0 32 32"
              fill="none"
              className="w-7 h-7"
            >
              <rect width="32" height="32" rx="6" fill="hsl(175 60% 20%)" />
              <path d="M7 22 L13 10 L19 17 L25 8" stroke="#26a69a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 22 L13 10 L19 17 L25 8" stroke="#26a69a44" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="25" cy="8" r="2.5" fill="#26a69a" />
            </svg>
            <div>
              <span className="font-bold text-foreground tracking-tight text-sm">ForexIQ</span>
              <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">Intelligence Board</span>
            </div>
          </div>

          {/* Universal Search */}
          <div className="flex-1 flex justify-center max-w-sm">
            <SearchBar onNavigate={(symbol) => setActiveTab(symbol)} />
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Live Data
            </span>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              EUR · USD · AED · GOLD
            </span>
          </div>
        </div>
      </header>

      {/* Main Tabs */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-border/60 bg-background/80 px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {SYMBOLS.map(sym => (
                <TabsTrigger
                  key={sym.id}
                  value={sym.id}
                  className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                  data-testid={`tab-${sym.id}`}
                >
                  <span className="mr-1.5">{sym.emoji}</span>
                  {sym.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {SYMBOLS.map(sym => (
              <TabsContent key={sym.id} value={sym.id} className="mt-0 h-full">
                <MarketPanel symbol={sym.id} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground/50">
          Data: Frankfurter API · gold-api.com · NewsData.io · No tracking · Indicators computed locally
        </div>
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
