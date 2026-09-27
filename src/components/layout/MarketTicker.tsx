// src/components/layout/MarketTicker.tsx

import React from 'react';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useMarket } from '../../context/MarketContext';
import { OTCPair } from '../../types/market';

export const MarketTicker: React.FC<{ onSelectPair?: (pair: OTCPair) => void }> = ({ onSelectPair }) => {
  const { pairs } = useSettings();
  const { selectedPair, setSelectedPair, getAllPairPrices } = useMarket();
  const pairPrices = getAllPairPrices();

  const handlePairClick = (pair: OTCPair) => {
    setSelectedPair(pair);
    if (onSelectPair) onSelectPair(pair);
  };

  return (
    <div className="w-full bg-dark-900/60 border-b border-dark-800/80 py-1.5 px-3 overflow-hidden select-none">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          Quotex OTC:
        </div>

        {pairs.filter(p => p.isActive).map(pair => {
          const livePrice = pairPrices[pair.symbol] || pair.lastPrice;
          const isSelected = selectedPair.symbol === pair.symbol;
          const isPositive = pair.change24h >= 0;

          return (
            <button
              key={pair.id}
              onClick={() => handlePairClick(pair)}
              className={`flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-white shadow-sm'
                  : 'bg-dark-850/60 border-dark-750 text-slate-300 hover:border-dark-600 hover:bg-dark-800'
              }`}
            >
              <div className="flex items-center gap-1.5 font-sans font-semibold">
                <span className="text-slate-200">{pair.symbol}</span>
                <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                  {pair.payoutRate}%
                </span>
              </div>

              <span className="font-mono font-medium text-slate-100">
                {livePrice.toFixed(pair.decimals)}
              </span>

              <span className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {isPositive ? `+${pair.change24h}%` : `${pair.change24h}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
