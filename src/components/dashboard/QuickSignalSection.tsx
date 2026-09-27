// src/components/dashboard/QuickSignalSection.tsx

import React, { useState } from 'react';
import { Sparkles, Search, ChevronDown, Check, Zap, Flame, ShieldAlert, Cpu } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useSignals } from '../../context/SignalContext';
import { useSettings } from '../../context/SettingsContext';
import { ExpiryDuration, OTCPair } from '../../types/market';

interface QuickSignalSectionProps {
  onScanClick?: () => void;
}

export const QuickSignalSection: React.FC<QuickSignalSectionProps> = ({ onScanClick }) => {
  const { pairs } = useSettings();
  const { selectedPair, setSelectedPair, selectedExpiry, setSelectedExpiry, currentPrice } = useMarket();
  const { generateSignal, isAnalyzing, analysisSteps } = useSignals();

  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const expiryOptions: { id: ExpiryDuration; label: string; desc: string }[] = [
    { id: '5s', label: '5s', desc: 'Microstructure & Tick Velocity' },
    { id: '10s', label: '10s', desc: 'Micro Momentum & Volatility' },
    { id: '15s', label: '15s', desc: 'Short-term Momentum & Trend' },
    { id: '30s', label: '30s', desc: 'Momentum + Trend + S/R' },
    { id: '45s', label: '45s', desc: 'Trend + Momentum + Regime' },
    { id: '1m', label: '1m', desc: 'Trend + Structure + Confirmation' },
  ];

  const filteredPairs = pairs
    .filter(p => p.isActive)
    .filter(p => p.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleGenerate = () => {
    generateSignal(selectedPair, selectedExpiry);
  };

  return (
    <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
          <h3 className="font-bold text-white text-base tracking-tight">AI Quantitative Signal Engine</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Quotex OTC Matrix</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Pair Selector Dropdown */}
        <div className="md:col-span-5 relative">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            1. Select OTC Instrument
          </label>

          <button
            type="button"
            onClick={() => setIsPairDropdownOpen(!isPairDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-dark-950 border border-dark-700 hover:border-cyan-500/50 text-white font-medium transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center font-mono font-bold text-xs text-cyan-300">
                {selectedPair.baseAsset.substring(0, 3)}
              </span>
              <div className="text-left">
                <div className="font-bold text-sm leading-tight text-white">{selectedPair.displayName}</div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  Payout {selectedPair.payoutRate}% • {currentPrice.toFixed(selectedPair.decimals)}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPairDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {/* Searchable Dropdown Popup */}
          {isPairDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2 rounded-xl bg-dark-950 border border-dark-700 shadow-2xl max-h-72 overflow-y-auto">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search OTC pair..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                {filteredPairs.map(pair => {
                  const isCurrent = pair.symbol === selectedPair.symbol;
                  return (
                    <button
                      key={pair.id}
                      type="button"
                      onClick={() => {
                        setSelectedPair(pair);
                        setIsPairDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                        isCurrent
                          ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-700/60'
                          : 'text-slate-300 hover:bg-dark-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{pair.displayName}</span>
                        <span className="px-1.5 py-0.2 rounded bg-dark-800 text-[10px] text-slate-400">
                          {pair.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono font-semibold">{pair.payoutRate}%</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expiry Selector */}
        <div className="md:col-span-7">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              2. Signal Expiry Profile
            </label>
            <span className="text-[10px] text-cyan-400 font-mono font-medium">
              {expiryOptions.find(o => o.id === selectedExpiry)?.desc}
            </span>
          </div>

          {/* Prominent Timer Buttons */}
          <div className="grid grid-cols-6 gap-1.5">
            {expiryOptions.map(option => {
              const isSelected = selectedExpiry === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedExpiry(option.id)}
                  className={`py-2 px-1 rounded-xl font-mono font-extrabold text-sm transition-all text-center border ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-black border-cyan-300 shadow-glow-cyan scale-[1.02]'
                      : 'bg-dark-950 text-slate-300 border-dark-750 hover:border-dark-600 hover:bg-dark-850'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main & Secondary CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-3 border-t border-dark-800">
        {/* Main CTA */}
        <div className="sm:col-span-8">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isAnalyzing}
            className="w-full relative group overflow-hidden py-3.5 px-6 rounded-xl font-black text-sm tracking-wide uppercase transition-all bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-glow-call disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
            <span>{isAnalyzing ? 'ANALYZING MARKET FEATURES...' : 'GENERATE SIGNAL'}</span>
          </button>
        </div>

        {/* Secondary CTA */}
        <div className="sm:col-span-4">
          <button
            type="button"
            onClick={onScanClick}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wide bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>SCAN OTC MARKETS</span>
          </button>
        </div>
      </div>

      {/* Real-time Analysis Progress Visualizer */}
      {isAnalyzing && (
        <div className="mt-4 p-3 rounded-xl bg-dark-950/80 border border-cyan-500/30">
          <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 animate-spin" />
            <span>QUANTITATIVE PIPELINE EXECUTION IN PROGRESS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
            {analysisSteps.map(step => (
              <div
                key={step.id}
                className={`p-1.5 rounded-lg text-center font-mono text-[10px] border transition-all ${
                  step.status === 'completed'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : step.status === 'in-progress'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 animate-pulse font-bold'
                    : 'bg-dark-900 text-slate-600 border-dark-800'
                }`}
              >
                <div>{step.label}</div>
                <div className="text-[9px] mt-0.5">
                  {step.status === 'completed' ? '✓ DONE' : step.status === 'in-progress' ? '● RUNNING' : '○ WAIT'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
