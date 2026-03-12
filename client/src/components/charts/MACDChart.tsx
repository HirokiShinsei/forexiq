import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { OHLCBar } from "../../../../shared/schema";

function calcEMASeries(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: number[] = new Array(period - 1).fill(NaN);
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

interface Props { candles: OHLCBar[]; }

export default function MACDChart({ candles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length < 26) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0d1117" }, textColor: "#8b9ab0", fontSize: 10 },
      grid: {
        vertLines: { color: "#1c2230", style: LineStyle.Dotted },
        horzLines: { color: "#1c2230", style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: "#1e2a3a" },
      timeScale: { borderColor: "#1e2a3a", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 120,
    });

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const closes = sorted.map(c => c.close);
    const ema12 = calcEMASeries(closes, 12);
    const ema26 = calcEMASeries(closes, 26);
    const macdLine = ema12.map((v, i) => (!isNaN(v) && !isNaN(ema26[i]) ? v - ema26[i] : NaN));

    const validMacd = macdLine.filter(v => !isNaN(v));
    const k = 2 / (9 + 1);
    let sigEma = validMacd.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
    const signalLine: number[] = new Array(macdLine.length - validMacd.length + 8).fill(NaN);
    signalLine.push(sigEma);
    const sigStart = macdLine.length - validMacd.length + 9;
    for (let i = sigStart; i < macdLine.length; i++) {
      sigEma = macdLine[i] * k + sigEma * (1 - k);
      signalLine.push(sigEma);
    }

    const macdData = sorted.map((c, i) => ({ time: c.time, value: macdLine[i] })).filter(d => !isNaN(d.value));
    const signalData = sorted.map((c, i) => ({ time: c.time, value: signalLine[i] })).filter(d => !isNaN(d.value));
    const histData = macdData.map((d, i) => ({
      time: d.time,
      value: d.value - (signalData[i]?.value ?? d.value),
      color: d.value - (signalData[i]?.value ?? d.value) >= 0 ? "#26a69a80" : "#ef535080",
    }));

    const macdSeries = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2, title: "MACD", priceLineVisible: false, lastValueVisible: true });
    macdSeries.setData(macdData as any);

    const sigSeries = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "Signal", priceLineVisible: false, lastValueVisible: true });
    sigSeries.setData(signalData as any);

    const histSeries = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
    histSeries.setData(histData as any);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [candles]);

  return <div ref={containerRef} style={{ width: "100%", height: 120 }} data-testid="macd-chart" />;
}
