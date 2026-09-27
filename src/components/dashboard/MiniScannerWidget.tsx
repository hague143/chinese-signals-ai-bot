// src/components/dashboard/MiniScannerWidget.tsx

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, PauseCircle, Zap } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useMarket } from '../../context/MarketContext';
import { useSignals } from '../../context/SignalContext';
import { OTCPair } from '../../types/market';
import { MasterSignalOutput } from '../../types/signal';
import { SignalPipeline } from '../../engine/signalPipeline';

export const MiniScannerWidget: React.FC<{ onViewAll?: () => void }> = ({ onViewAll }) => {
  const { pairs, settings } = useSettings();
  const { provider, setSelectedPair, selectedExpiry, setSelectedExpiry } = useMarket();
  const { generateSignal } = useSignals();

  const [topSignals, setTopSignals] = useState<{ pair: OTCPair; signal: MasterSignalOutput | null; loading: boolean }[]>([]);

  useEffect(() => {
    const activePairs = pairs.filter(p => p.isActive).slice(0, 4);
    
    const loadQuickSignals = async () => {
      const results = await Promise.all(
        activePairs.map(async pair => {
          try {
            const [c1m, c5m, c15m] = await Promise.all([
              provider.getCandles(pair.symbol, '1m', 60),
              provider.getCandles(pair.symbol, '5m', 30),
              provider.getCandles(pair.symbol, '15m', 20),
            ]);

            if (c1m && c1m.length >= 15) {
              const sig = SignalPipeline.generateSignal({
                symbol: pair.symbol,
                candles: c1m,
                higherTfCandles5m: c5m,
                higherTfCandles15m: c15m,
                expiry: selectedExpiry,
                settings,
              });
              return { pair, signal: sig, loading: false };
            }
          } catch {
            // ignore
          }
          return { pair, signal: null, loading: false };
        })
      );
      setTopSignals(results);
    };

    loadQuickSignals();
  }, [pairs, provider, selectedExpiry, settings]);

  const handleSelectPairSignal = (pair: OTCPair, sig?: MasterSignalOutput | null) => {
    setSelectedPair(pair);
    if (sig) {
      setSelectedExpiry(sig.expiry);
      generateSignal(pair, sig.expiry, sig);
    } else {
      generateSignal(pair, selectedExpiry);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h4 className="font-bold text-white text-sm">Real-time OTC Opportunities</h4>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
        >
          <span>Full Scanner</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {topSignals.map(({ pair, signal }) => {
          if (!signal) return null;
          const isCall = signal.direction === 'CALL';
          const isPut = signal.direction === 'PUT';

          return (
            <div
              key={pair.id}
              onClick={() => handleSelectPairSignal(pair, signal)}
              className="p-2.5 rounded-xl bg-dark-950/70 hover:bg-dark-850 border border-dark-800 hover:border-dark-650 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-dark-800 flex items-center justify-center font-mono font-bold text-[11px] text-slate-300">
                  {pair.baseAsset.substring(0, 3)}
                </span>
                <div>
                  <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    {pair.displayName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {pair.category} • Payout {pair.payoutRate}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-mono font-extrabold text-xs text-slate-200">
                    {Math.round(signal.confidence)}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {signal.modelAgreement.agreementRatio} AI
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs flex items-center gap-1 ${
                  isCall
                    ? 'bg-call/20 text-call border border-call/40'
                    : isPut
                    ? 'bg-put/20 text-put border border-put/40'
                    : 'bg-wait/20 text-wait border border-wait/40'
                }`}>
                  {isCall ? <ArrowUpRight className="w-3.5 h-3.5" /> : isPut ? <ArrowDownRight className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  <span>{signal.direction}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
