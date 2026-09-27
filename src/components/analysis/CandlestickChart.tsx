// src/components/analysis/CandlestickChart.tsx

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle } from '../../types/market';
import { IndicatorValues } from '../../types/indicators';
import { MasterSignalOutput } from '../../types/signal';
import { TechnicalEngine } from '../../engine/technicalEngine';

interface CandlestickChartProps {
  candles: Candle[];
  symbol: string;
  decimals?: number;
  currentPrice: number;
  indicators?: IndicatorValues | null;
  activeSignal?: MasterSignalOutput | null;
  showEMA9?: boolean;
  showEMA21?: boolean;
  showEMA50?: boolean;
  showBollinger?: boolean;
  showSRLevels?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  symbol,
  decimals = 5,
  currentPrice,
  indicators,
  activeSignal,
  showEMA9 = true,
  showEMA21 = true,
  showEMA50 = true,
  showBollinger = true,
  showSRLevels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Compute moving averages & indicators for the entire series
  const seriesData = useMemo(() => {
    if (candles.length === 0) return null;
    const closes = candles.map(c => c.close);
    const ema9 = TechnicalEngine.calculateEMA(closes, 9);
    const ema21 = TechnicalEngine.calculateEMA(closes, 21);
    const ema50 = TechnicalEngine.calculateEMA(closes, 50);
    const bb = TechnicalEngine.calculateBollingerBands(closes, 20, 2);
    const { support, resistance } = TechnicalEngine.calculateSupportResistance(candles);

    return { ema9, ema21, ema50, bb, support, resistance };
  }, [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0 || !seriesData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 65, bottom: 25, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Find price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    if (showBollinger && seriesData.bb) {
      seriesData.bb.lower.forEach(l => { if (l > 0 && l < minPrice) minPrice = l; });
      seriesData.bb.upper.forEach(u => { if (u > 0 && u > maxPrice) maxPrice = u; });
    }

    // Add padding to bounds
    const priceRange = Math.max(maxPrice - minPrice, 0.0001);
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    const totalRange = maxPrice - minPrice;

    const getY = (price: number) => {
      return padding.top + chartHeight - ((price - minPrice) / totalRange) * chartHeight;
    };

    const candleCount = candles.length;
    const candleSpacing = chartWidth / candleCount;
    const candleWidth = Math.max(2, candleSpacing * 0.7);

    const getX = (index: number) => {
      return padding.left + index * candleSpacing + candleSpacing / 2;
    };

    // Draw Grid Lines
    ctx.strokeStyle = '#161e31';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (totalRange / gridSteps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels on right
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(decimals), width - padding.right + 6, y + 3);
    }
    ctx.setLineDash([]);

    // Draw Bollinger Bands Area
    if (showBollinger && seriesData.bb) {
      ctx.fillStyle = 'rgba(0, 242, 254, 0.04)';
      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.bb.upper[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = candleCount - 1; i >= 0; i--) {
        const x = getX(i);
        const y = getY(seriesData.bb.lower[i]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Upper & Lower BB lines
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.bb.upper[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.bb.lower[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Support & Resistance Lines
    if (showSRLevels && seriesData.support && seriesData.resistance) {
      // Resistance line
      const resY = getY(seriesData.resistance);
      ctx.strokeStyle = 'rgba(255, 51, 102, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, resY);
      ctx.lineTo(width - padding.right, resY);
      ctx.stroke();
      ctx.fillStyle = '#ff3366';
      ctx.fillText(`RES ${seriesData.resistance.toFixed(decimals)}`, padding.left + 5, resY - 4);

      // Support line
      const supY = getY(seriesData.support);
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
      ctx.beginPath();
      ctx.moveTo(padding.left, supY);
      ctx.lineTo(width - padding.right, supY);
      ctx.stroke();
      ctx.fillStyle = '#00e676';
      ctx.fillText(`SUP ${seriesData.support.toFixed(decimals)}`, padding.left + 5, supY + 12);
      ctx.setLineDash([]);
    }

    // Draw Moving Averages
    if (showEMA9 && seriesData.ema9) {
      ctx.strokeStyle = '#00f2fe'; // Cyan EMA9
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.ema9[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (showEMA21 && seriesData.ema21) {
      ctx.strokeStyle = '#f59e0b'; // Amber EMA21
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.ema21[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (showEMA50 && seriesData.ema50) {
      ctx.strokeStyle = '#a855f7'; // Purple EMA50
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < candleCount; i++) {
        const x = getX(i);
        const y = getY(seriesData.ema50[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Candlesticks
    for (let i = 0; i < candleCount; i++) {
      const c = candles[i];
      const isBullish = c.close >= c.open;
      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const color = isBullish ? '#00e676' : '#ff3366';
      ctx.strokeStyle = color;
      ctx.fillStyle = isBullish ? '#00e676' : '#ff3366';
      ctx.lineWidth = 1.2;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    // Draw Current Live Price Horizontal Line
    const currentPriceY = getY(currentPrice);
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentPriceY);
    ctx.lineTo(width - padding.right, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Price Pill on Right Axis
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(width - padding.right, currentPriceY - 9, padding.right, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(currentPrice.toFixed(decimals), width - padding.right + 4, currentPriceY + 3.5);

    // Draw Signal Marker at the latest bar if active
    if (activeSignal && activeSignal.direction !== 'WAIT') {
      const lastX = getX(candleCount - 1);
      const lastCandle = candles[candleCount - 1];
      const isCall = activeSignal.direction === 'CALL';

      if (isCall) {
        // Upward marker under candle low
        const markerY = getY(lastCandle.low) + 16;
        ctx.fillStyle = '#00e676';
        ctx.beginPath();
        ctx.moveTo(lastX, markerY - 8);
        ctx.lineTo(lastX - 6, markerY + 4);
        ctx.lineTo(lastX + 6, markerY + 4);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CALL', lastX, markerY + 14);
      } else {
        // Downward marker above candle high
        const markerY = getY(lastCandle.high) - 16;
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.moveTo(lastX, markerY + 8);
        ctx.lineTo(lastX - 6, markerY - 4);
        ctx.lineTo(lastX + 6, markerY - 4);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PUT', lastX, markerY - 8);
      }
    }

    // Draw Crosshair on mouse hover
    if (mousePos && mousePos.x >= padding.left && mousePos.x <= width - padding.right) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, padding.top);
      ctx.lineTo(mousePos.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(width - padding.right, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [candles, seriesData, currentPrice, decimals, showEMA9, showEMA21, showEMA50, showBollinger, showSRLevels, activeSignal, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const paddingLeft = 10;
    const chartWidth = rect.width - 75;
    const index = Math.floor(((x - paddingLeft) / chartWidth) * candles.length);
    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  const activeCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div className="relative w-full h-[400px] bg-dark-950 rounded-2xl border border-dark-800 overflow-hidden select-none">
      {/* Top Legend Bar */}
      <div className="absolute top-2 left-3 right-3 z-10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 bg-dark-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-dark-800 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">{symbol}</span>
          {activeCandle && (
            <div className="flex items-center gap-2">
              <span>O: <strong className="text-slate-200">{activeCandle.open.toFixed(decimals)}</strong></span>
              <span>H: <strong className="text-slate-200">{activeCandle.high.toFixed(decimals)}</strong></span>
              <span>L: <strong className="text-slate-200">{activeCandle.low.toFixed(decimals)}</strong></span>
              <span>C: <strong className={`${activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}`}>{activeCandle.close.toFixed(decimals)}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          {showEMA9 && <span className="text-cyan-400 font-bold">● EMA 9</span>}
          {showEMA21 && <span className="text-amber-400 font-bold">● EMA 21</span>}
          {showEMA50 && <span className="text-purple-400 font-bold">● EMA 50</span>}
          {showBollinger && <span className="text-cyan-200/60 font-bold">■ BB(20,2)</span>}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full cursor-crosshair"
      />
    </div>
  );
};
