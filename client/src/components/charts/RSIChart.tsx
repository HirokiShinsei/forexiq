import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  LineSeries,
} from "lightweight-charts";
import type { OHLCBar } from "../../../../shared/schema";

interface Props {
  candles: OHLCBar[];
}

function calcRSISeries(closes: number[], period = 14) {
  const result: { idx: number; value: number }[] = [];
  if (closes.length < period + 1) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ idx: i, value: 100 - 100 / (1 + rs) });
  }
  return result;
}

export default function RSIChart({ candles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0d1117" }, textColor: "#8b9ab0", fontSize: 10 },
      grid: {
        vertLines: { color: "#1c2230", style: LineStyle.Dotted },
        horzLines: { color: "#1c2230", style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: "#1e2a3a", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: "#1e2a3a", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 120,
    });

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const closes = sorted.map(c => c.close);
    const rsiPoints = calcRSISeries(closes, 14);
    const rsiData = rsiPoints.map(p => ({ time: sorted[p.idx].time, value: p.value }));

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      title: "RSI(14)",
      priceLineVisible: false,
      lastValueVisible: true,
    });
    rsiSeries.setData(rsiData as any);

    if (sorted.length >= 2) {
      const first = sorted[14].time;
      const last = sorted[sorted.length - 1].time;
      const ob = chart.addSeries(LineSeries, { color: "#ef535070", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      const os = chart.addSeries(LineSeries, { color: "#26a69a70", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      ob.setData([{ time: first, value: 70 }, { time: last, value: 70 }] as any);
      os.setData([{ time: first, value: 30 }, { time: last, value: 30 }] as any);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [candles]);

  return <div ref={containerRef} style={{ width: "100%", height: 120 }} data-testid="rsi-chart" />;
}
