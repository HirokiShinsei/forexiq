import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignalCard from "../components/SignalCard";
import NewsPanel from "../components/NewsPanel";
import QuoteHeader from "../components/QuoteHeader";
import PriceHistoryPanel from "../components/PriceHistoryPanel";
import type { MarketData } from "../../../shared/schema";
import { AlertCircle, Activity, Newspaper } from "lucide-react";
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
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

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
      "The <strong>SEND NOW</strong> signal triggers when conditions are optimal for transfers. Monitor <strong>Fed rate decisions</strong> and <strong>global risk events</strong> — both directly impact this pair.",
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
      "<strong>BUY</strong> signals suggest gold may rally — favorable for accumulating physical gold or gold funds. <strong>SELL / HOLD</strong> signals help you decide when to liquidate or wait.",
    ],
  },
};

function MarketPanel({ symbol }: { symbol: string }) {
  const { data, isLoading, error, refetch, isFetching } = useMarketData(symbol);

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
  const pairLabel = symbol.replace("_", "/");
  const tabNews   = data.news.filter(n => n.relevance.includes(pairLabel));

  return (
    <div className="p-4 space-y-4">
      {/* Live quote header */}
      <QuoteHeader
        quote={data.quote}
        label={pairLabel}
        isLoading={isFetching}
        onRefresh={() => refetch()}
      />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left: Price History + News */}
        <div className="xl:col-span-2 space-y-4">

          <PriceHistoryPanel
            quote={data.quote}
            periodStats={data.periodStats}
            symbol={symbol}
          />

          {/* News — filtered to this pair only */}
          <div className="rounded-xl border border-border/60 bg-card flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper size={12} className="text-muted-foreground/70" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {pairLabel} News
                </span>
              </div>
              {tabNews.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  {tabNews.length}
                </span>
              )}
            </div>
            <div className="overflow-y-auto max-h-[480px] p-3">
              <NewsPanel news={data.news} filterSymbol={symbol} />
            </div>
          </div>
        </div>

        {/* Right: Signal + Context */}
        <div className="space-y-4">

          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Activity size={11} />
              Decision Signal {ctx.isTransfer ? "— OFW / Remittance" : "— Investors"}
            </div>
            <SignalCard signal={data.signal} symbol={symbol} />
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              How to Read This
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
              <div className="pt-2 mt-1 border-t border-border/50 text-muted-foreground/50 text-[11px] italic">
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
        <div className="flex items-center justify-between px-4 h-12 gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg aria-label="ForexIQ Logo" viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <rect width="32" height="32" rx="6" fill="hsl(175 60% 20%)" />
              <path d="M7 22 L13 10 L19 17 L25 8" stroke="#26a69a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 22 L13 10 L19 17 L25 8" stroke="#26a69a44" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="25" cy="8" r="2.5" fill="#26a69a" />
            </svg>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground tracking-tight text-sm">ForexIQ</span>
              <span className="text-xs text-muted-foreground/60 hidden sm:inline">Intelligence Board</span>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="hidden sm:inline">Live Data</span>
            <span className="text-muted-foreground/40 hidden lg:inline ml-1">· EUR · USD · AED · GOLD</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Scrollable tab bar — works on any screen width */}
          <div className="border-b border-border/60 bg-background/80 overflow-x-auto scrollbar-none">
            <TabsList className="bg-transparent h-auto p-0 gap-0 flex w-max min-w-full">
              {SYMBOLS.map(sym => (
                <TabsTrigger
                  key={sym.id}
                  value={sym.id}
                  className="flex-shrink-0 px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium whitespace-nowrap"
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

      {/* Minimal footer — data attribution only */}
      <footer className="border-t border-border/40 px-5 py-2">
        <p className="text-[11px] text-muted-foreground/40">
          Data: Wise · Frankfurter · Yahoo Finance · Signals computed locally · Not financial advice
        </p>
      </footer>
    </div>
  );
}
