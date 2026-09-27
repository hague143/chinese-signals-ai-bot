// src/components/analysis/PairAnalysisView.tsx

import React, { useState, useMemo } from 'react';
import { CandlestickChart } from './CandlestickChart';
import { useMarket } from '../../context/MarketContext';
import { useSignals } from '../../context/SignalContext';
import { useSettings } from '../../context/SettingsContext';
import { TechnicalEngine } from '../../engine/technicalEngine';
import { Timeframe, ExpiryDuration } from '../../types/market';
import {
  Sparkles,
  Sliders,
  Layers,
  Activity,
  BarChart2,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
  Cpu,
  ChevronDown,
} from 'lucide-react';

export const PairAnalysisView: React.FC = () => {
  const { selectedPair, setSelectedPair, selectedTimeframe, setSelectedTimeframe, selectedExpiry, setSelectedExpiry, candles, currentPrice, isLoadingCandles } = useMarket();
  const { currentSignal, generateSignal, isAnalyzing } = useSignals();
  const { pairs } = useSettings();

  // Chart Overlay Toggles
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showSRLevels, setShowSRLevels] = useState(true);

  // Timeframe options
  const timeframes: { id: Timeframe; label: string }[] = [
    { id: '5s', label: '5s' },
    { id: '15s', label: '15s' },
    { id: '30s', label: '30s' },
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
  ];

  // Expiry options
  const expiryOptions: ExpiryDuration[] = ['5s', '10s', '15s', '30s', '45s', '1m'];

  // Calculate live indicators for display
  const ind = useMemo(() => {
    if (!candles || candles.length < 15) return null;
    try {
      return TechnicalEngine.extractFeatures(candles);
    } catch {
      return null;
    }
  }, [candles]);

  return (
    <div className="space-y-5 select-none">
      {/* Top Controls Header */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        {/* Pair selector pill */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPair.symbol}
            onChange={(e) => {
              const p = pairs.find(item => item.symbol === e.target.value);
              if (p) setSelectedPair(p);
            }}
            className="px-3.5 py-2 rounded-xl bg-dark-950 border border-dark-700 text-white font-bold font-mono text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {pairs.filter(p => p.isActive).map(p => (
              <option key={p.id} value={p.symbol} className="bg-dark-950 text-white">
                {p.displayName} ({p.payoutRate}%)
              </option>
            ))}
          </select>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">Live Price:</span>
            <span className="font-bold text-cyan-300 text-sm">
              {currentPrice.toFixed(selectedPair.decimals)}
            </span>
          </div>
        </div>

        {/* Timeframe & Expiry Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Chart Timeframe */}
          <div className="flex items-center bg-dark-950 p-1 rounded-xl border border-dark-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2">TF:</span>
            {timeframes.map(tf => (
              <button
                key={tf.id}
                onClick={() => setSelectedTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  selectedTimeframe === tf.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Quick Signal CTA */}
          <button
            onClick={() => generateSignal()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-glow-call transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Generate Signal'}</span>
          </button>
        </div>
      </div>

      {/* Candlestick Chart Area with Overlay Toggles */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">Indicators:</span>
            
            <button
              onClick={() => setShowEMA9(!showEMA9)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                showEMA9 ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600' : 'bg-dark-900 text-slate-500 border-dark-800'
              }`}
            >
              EMA 9
            </button>

            <button
              onClick={() => setShowEMA21(!showEMA21)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                showEMA21 ? 'bg-amber-950/80 text-amber-300 border-amber-600' : 'bg-dark-900 text-slate-500 border-dark-800'
              }`}
            >
              EMA 21
            </button>

            <button
              onClick={() => setShowEMA50(!showEMA50)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                showEMA50 ? 'bg-purple-950/80 text-purple-300 border-purple-600' : 'bg-dark-900 text-slate-500 border-dark-800'
              }`}
            >
              EMA 50
            </button>

            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                showBollinger ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600' : 'bg-dark-900 text-slate-500 border-dark-800'
              }`}
            >
              Bollinger Bands
            </button>

            <button
              onClick={() => setShowSRLevels(!showSRLevels)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                showSRLevels ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' : 'bg-dark-900 text-slate-500 border-dark-800'
              }`}
            >
              S/R Levels
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {candles.length} Candles • Bar updates synchronized
          </div>
        </div>

        {/* Chart Canvas */}
        <CandlestickChart
          candles={candles}
          symbol={selectedPair.displayName}
          decimals={selectedPair.decimals}
          currentPrice={currentPrice}
          indicators={ind}
          activeSignal={currentSignal}
          showEMA9={showEMA9}
          showEMA21={showEMA21}
          showEMA50={showEMA50}
          showBollinger={showBollinger}
          showSRLevels={showSRLevels}
        />
      </div>

      {/* Technical Indicators Deep Grid */}
      {ind && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* RSI Panel */}
          <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold">RSI (14)</span>
              <span className={`font-mono font-bold ${
                ind.rsi14 >= 70 ? 'text-rose-400' : ind.rsi14 <= 30 ? 'text-emerald-400' : 'text-cyan-300'
              }`}>
                {ind.rsi14.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden mt-2 relative">
              <div
                className={`h-full rounded-full ${
                  ind.rsi14 >= 70 ? 'bg-rose-500' : ind.rsi14 <= 30 ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${ind.rsi14}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Oversold: 30</span>
              <span>Overbought: 70</span>
            </div>
          </div>

          {/* MACD Panel */}
          <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold">MACD (12, 26, 9)</span>
              <span className={`font-mono font-bold ${ind.macdHistogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ind.macdHistogram > 0 ? `+${ind.macdHistogram.toFixed(5)}` : ind.macdHistogram.toFixed(5)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2">
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">MACD Line</div>
                <div className="text-slate-200">{ind.macdLine.toFixed(5)}</div>
              </div>
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">Signal Line</div>
                <div className="text-slate-200">{ind.signalLine.toFixed(5)}</div>
              </div>
            </div>
          </div>

          {/* Stochastic & Williams %R */}
          <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold">Stochastic (14, 3)</span>
              <span className="font-mono font-bold text-cyan-300">
                %K: {ind.stochK.toFixed(1)} / %D: {ind.stochD.toFixed(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2">
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">Williams %R</div>
                <div className="text-slate-200">{ind.williamsR.toFixed(1)}</div>
              </div>
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">CCI (20)</div>
                <div className="text-slate-200">{ind.cci.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* ADX & ATR */}
          <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold">ADX Trend Strength</span>
              <span className={`font-mono font-bold ${ind.adx14 > 25 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {ind.adx14.toFixed(1)} {ind.adx14 > 25 ? '(Strong)' : '(Weak)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2">
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">DI+ / DI-</div>
                <div className="text-slate-200">{ind.diPlus.toFixed(1)} / {ind.diMinus.toFixed(1)}</div>
              </div>
              <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                <div className="text-[9px] text-slate-500">ATR (14)</div>
                <div className="text-slate-200">{ind.atr14.toFixed(5)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
