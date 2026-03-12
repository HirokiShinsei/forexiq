import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";
import type { OHLCBar, TechnicalIndicators } from "../../../../shared/schema";

interface Props {
  candles: OHLCBar[];
  indicators: TechnicalIndicators;
  symbol: string;
}

export default function CandlestickChart({ candles, indicators, symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const bg = "#0d1117";
    const gridColor = "#1c2230";
    const textColor = "#8b9ab0";
    const borderColor = "#1e2a3a";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
        fontSize: 11,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor, style: LineStyle.Dotted },
        horzLines: { color: gridColor, style: LineStyle.Dotted },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 340,
    });

    const validCandles = candles
      .filter(c => c.time && c.open && c.high && c.low && c.close)
      .sort((a, b) => a.time - b.time);

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeries.setData(validCandles as any);

    // SMA 20 line
    const closes = validCandles.map(c => c.close);
    if (validCandles.length >= 20) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        title: "SMA20",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const sma20Data = validCandles.slice(19).map((c, i) => {
        const slice = closes.slice(i, i + 20);
        const val = slice.reduce((a, b) => a + b, 0) / 20;
        return { time: c.time, value: val };
      });
      sma20Series.setData(sma20Data as any);
    }

    // SMA 50 line
    if (validCandles.length >= 50) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 1,
        title: "SMA50",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const sma50Data = validCandles.slice(49).map((c, i) => {
        const slice = closes.slice(i, i + 50);
        const val = slice.reduce((a, b) => a + b, 0) / 50;
        return { time: c.time, value: val };
      });
      sma50Series.setData(sma50Data as any);
    }

    // Bollinger Bands
    if (validCandles.length >= 20) {
      const upperData: { time: number; value: number }[] = [];
      const lowerData: { time: number; value: number }[] = [];

      for (let i = 19; i < validCandles.length; i++) {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / 20;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        upperData.push({ time: validCandles[i].time, value: mean + 2 * stdDev });
        lowerData.push({ time: validCandles[i].time, value: mean - 2 * stdDev });
      }

      const bbUpperSeries = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "BB Upper",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbUpperSeries.setData(upperData as any);

      const bbLowerSeries = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "BB Lower",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbLowerSeries.setData(lowerData as any);
    }

    chart.timeScale().fitContent();

    // Responsive resize
    const ro = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        chart.applyOptions({ width, height: height || 340 });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, indicators, symbol]);

  return (
    <div
      ref={containerRef}
      className="candle-container w-full"
      style={{ minHeight: 340 }}
      data-testid="candlestick-chart"
    />
  );
}
