// src/components/scanner/OTCScannerView.tsx

import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Sparkles, ArrowUpRight, ArrowDownRight, PauseCircle, ChevronRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useSignals } from '../../context/SignalContext';
import { useMarket } from '../../context/MarketContext';
import { useSettings } from '../../context/SettingsContext';
import { MasterSignalOutput, SignalDirection } from '../../types/signal';
import { OTCPair } from '../../types/market';

export const OTCScannerView: React.FC<{ onTradePair?: (pair: OTCPair) => void }> = ({ onTradePair }) => {
  const { isScanning, scanResults, scanAllMarkets, generateSignal } = useSignals();
  const { setSelectedPair, selectedExpiry, setSelectedExpiry } = useMarket();
  const { settings, pairs } = useSettings();

  const [dirFilter, setDirFilter] = useState<'ALL' | 'CALL' | 'PUT' | 'WAIT'>('ALL');
  const [confFilter, setConfFilter] = useState<number>(0); // 0 = all, 75, 80, 85, 90
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (scanResults.length === 0) {
      scanAllMarkets();
    }
  }, [scanResults.length, scanAllMarkets]);

  const filteredResults = scanResults.filter(sig => {
    if (dirFilter !== 'ALL' && sig.direction !== dirFilter) return false;
    if (confFilter > 0 && sig.confidence < confFilter) return false;
    if (searchTerm && !sig.symbol.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleRowClick = (sig: MasterSignalOutput) => {
    const p = pairs.find((item: OTCPair) => item.symbol === sig.symbol);
    if (p) {
      setSelectedPair(p);
      setSelectedExpiry(sig.expiry);
      generateSignal(p, sig.expiry, sig);
      if (onTradePair) onTradePair(p);
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Top Banner & Scanner CTA */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-black text-white">Quotex OTC Market Scanner</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-pair scan synchronized with live candle streams. Select any pair to trade the exact setup.
          </p>
        </div>

        <button
          onClick={() => scanAllMarkets()}
          disabled={isScanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-glow-cyan transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'SCANNING MARKETS...' : 'SCAN ALL OTC MARKETS'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Direction Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-bold uppercase text-[10px] mr-1">Direction:</span>
          {(['ALL', 'CALL', 'PUT', 'WAIT'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => setDirFilter(dir)}
              className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-colors ${
                dirFilter === dir
                  ? dir === 'CALL'
                    ? 'bg-call/20 text-call border border-call/50'
                    : dir === 'PUT'
                    ? 'bg-put/20 text-put border border-put/50'
                    : dir === 'WAIT'
                    ? 'bg-wait/20 text-wait border border-wait/50'
                    : 'bg-dark-750 text-white border border-dark-600'
                  : 'bg-dark-950 text-slate-400 hover:bg-dark-850'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        {/* Middle: Confidence Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-bold uppercase text-[10px] mr-1">Confidence:</span>
          {[
            { val: 0, label: 'All' },
            { val: 75, label: '75%+' },
            { val: 80, label: '80%+' },
            { val: 85, label: '85%+' },
            { val: 90, label: '90%+' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setConfFilter(opt.val)}
              className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs transition-colors ${
                confFilter === opt.val
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                  : 'bg-dark-950 text-slate-400 hover:bg-dark-850'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Right: Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search pair..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-dark-950 border border-dark-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-36"
          />
        </div>
      </div>

      {/* Results Scanner Table */}
      <div className="rounded-2xl bg-dark-900 border border-dark-750 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-950/70 text-[10px] uppercase font-bold text-slate-400">
                <th className="py-3 px-4">PAIR</th>
                <th className="py-3 px-3">SIGNAL</th>
                <th className="py-3 px-3">CONFIDENCE</th>
                <th className="py-3 px-3">EXPIRY</th>
                <th className="py-3 px-3">TREND</th>
                <th className="py-3 px-3">MOMENTUM</th>
                <th className="py-3 px-3">AI CONSENSUS</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60 font-mono">
              {filteredResults.map(sig => {
                const isCall = sig.direction === 'CALL';
                const isPut = sig.direction === 'PUT';
                const isWait = sig.direction === 'WAIT';
                const isReady = sig.direction !== 'WAIT' && sig.confidence >= settings.minConfidenceThreshold;

                return (
                  <tr
                    key={sig.id}
                    onClick={() => handleRowClick(sig)}
                    className="hover:bg-dark-850/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="group-hover:text-cyan-300 transition-colors">{sig.symbol}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 ${
                        isCall
                          ? 'bg-call/20 text-call border border-call/40'
                          : isPut
                          ? 'bg-put/20 text-put border border-put/40'
                          : 'bg-wait/20 text-wait border border-wait/40'
                      }`}>
                        {isCall ? <ArrowUpRight className="w-3.5 h-3.5" /> : isPut ? <ArrowDownRight className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                        {sig.direction}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${
                          sig.confidence >= 80 ? 'text-emerald-400' : sig.confidence >= 70 ? 'text-cyan-300' : 'text-amber-400'
                        }`}>
                          {Math.round(sig.confidence)}%
                        </span>
                        <div className="w-12 bg-dark-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              sig.confidence >= 80 ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`}
                            style={{ width: `${sig.confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300 font-semibold">{sig.expiry}</td>

                    <td className="py-3 px-3 font-sans text-xs text-slate-300">
                      {sig.trend.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-3 font-sans text-xs text-slate-300">
                      {sig.momentum}
                    </td>

                    <td className="py-3 px-3 font-bold text-purple-300">
                      {sig.modelAgreement.agreementRatio}
                    </td>

                    <td className="py-3 px-3">
                      {isReady ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold text-[10px]">
                          READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-dark-800 text-slate-400 border border-dark-700 font-bold text-[10px]">
                          FILTERED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(sig);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-dark-800 group-hover:bg-cyan-900/50 text-slate-300 group-hover:text-cyan-300 border border-dark-700 group-hover:border-cyan-700 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Trade Setup</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
