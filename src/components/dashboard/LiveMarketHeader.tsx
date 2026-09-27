// src/components/dashboard/LiveMarketHeader.tsx

import React, { useState, useEffect } from 'react';
import { Server, Activity, ShieldAlert, Cpu, ArrowUpRight, Clock, RefreshCw, Zap } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useSettings } from '../../context/SettingsContext';

export const LiveMarketHeader: React.FC = () => {
  const { selectedPair, currentPrice, lastTick, marketStatus, refreshCandles, isLoadingCandles } = useMarket();
  const { settings } = useSettings();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => setTimeStr(new Date().toLocaleTimeString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 shadow-card">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Active Pair Focus */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-950 to-dark-900 border border-cyan-500/30 flex items-center justify-center font-bold font-mono text-cyan-300 text-base shadow-sm">
            {selectedPair.baseAsset}/{selectedPair.quoteAsset}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">{selectedPair.displayName}</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                Payout: {selectedPair.payoutRate}%
              </span>
              <span className="px-2 py-0.5 rounded-md bg-dark-750 text-slate-300 font-mono text-xs border border-dark-650">
                Quotex OTC
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="font-mono text-slate-200 text-sm font-semibold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  lastTick?.direction === 'UP' ? 'bg-emerald-400' : lastTick?.direction === 'DOWN' ? 'bg-rose-400' : 'bg-slate-400'
                }`}></span>
                {currentPrice.toFixed(selectedPair.decimals)}
              </span>

              <span className="text-slate-600">|</span>

              <span className={`font-mono font-medium ${selectedPair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedPair.change24h >= 0 ? `+${selectedPair.change24h}%` : `${selectedPair.change24h}%`} (24h)
              </span>

              <span className="text-slate-600 hidden sm:inline">|</span>

              <span className="text-slate-400 hidden sm:inline">
                High: <strong className="font-mono text-slate-300">{selectedPair.high24h}</strong> Low: <strong className="font-mono text-slate-300">{selectedPair.low24h}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Connectivity Badges */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Feed status */}
          <div className="px-3 py-1.5 rounded-xl bg-dark-800/90 border border-dark-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feed Status</div>
              <div className="font-semibold text-slate-200">
                {settings.dataMode === 'DEMO' ? 'Demo Market Simulator' : 'Quotex Stream'}
              </div>
            </div>
          </div>

          {/* AI Model status */}
          <div className="px-3 py-1.5 rounded-xl bg-dark-800/90 border border-dark-700 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Engine</div>
              <div className="font-semibold text-purple-300">6-Layer Ensemble Ready</div>
            </div>
          </div>

          {/* Refresh action */}
          <button
            onClick={() => refreshCandles()}
            disabled={isLoadingCandles}
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh candles"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCandles ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
