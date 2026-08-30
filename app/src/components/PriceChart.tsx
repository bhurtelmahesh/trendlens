import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { AnalysisResult, Candle } from '../../../shared/types';
import { ema, emaPeriodFor } from '../analysis/ema';

interface Props {
  candles: Candle[];
  analysis: AnalysisResult;
}

const UP = '#4bbf73';
const DOWN = '#e5534b';
const EMA_COLOR = '#e0a52b';
const GRID = '#1b2430';
const TEXT = '#8b97a3';

/**
 * Candles + EMA line + swing-high/low price lines. The swing levels are drawn
 * with `createPriceLine({ price })`, so they sit at the exact value the brief
 * reports — no separate screen-space positioning to drift.
 */
export function PriceChart({ candles, analysis }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart: IChartApi = createChart(host, {
      width: host.clientWidth || 640,
      height: host.clientHeight || 380,
      layout: { background: { color: 'transparent' }, textColor: TEXT, fontFamily: 'inherit' },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      rightPriceScale: { borderColor: GRID },
      timeScale: { borderColor: GRID, timeVisible: true },
      crosshair: { mode: 0 },
    });

    const resize = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) {
        chart.resize(host.clientWidth, host.clientHeight);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: (c.time / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    const closes = candles.map((c) => c.close);
    const emaSeries = ema(closes, emaPeriodFor(closes.length));
    const emaLine = chart.addSeries(LineSeries, {
      color: EMA_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    emaLine.setData(
      candles.map((c, i) => ({ time: (c.time / 1000) as UTCTimestamp, value: emaSeries[i]! })),
    );

    candleSeries.createPriceLine({
      price: analysis.lastSwingHigh.price,
      color: DOWN,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'swing high',
    });
    candleSeries.createPriceLine({
      price: analysis.lastSwingLow.price,
      color: '#5bc0c7',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'swing low',
    });

    chart.timeScale().fitContent();
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, analysis]);

  return <div className="chart" ref={hostRef} role="img" aria-label="Price chart with EMA and swing levels" />;
}
