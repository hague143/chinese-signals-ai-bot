// src/components/dashboard/MarketRegimeOverview.tsx

import React from 'react';
import { Gauge, Activity, ShieldCheck, Cpu, Waves } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useSignals } from '../../context/SignalContext';

export const MarketRegimeOverview: React.FC = () => {
  const { currentSignal } = useSignals();
  const { marketStatus } = useMarket();

  const regime = currentSignal?.marketRegime || 'TRENDING';
  const vol = currentSignal?.volatilityRegime || 'NORMAL_VOLATILITY';
  const confidence = currentSignal?.confidence || 75;

  return (
    <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <h4 className="font-bold text-white text-sm">Market Dynamics & AI State</h4>
        </div>
        <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-mono text-[10px] border border-purple-800/50">
          6 Active AI Sub-Models
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>Market Regime</span>
          </div>
          <div className="font-black text-sm text-cyan-300 tracking-tight">
            {regime}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {regime === 'TRENDING' ? 'Directional structure aligned' : regime === 'RANGING' ? 'Boundary oscillation' : 'Dynamic regime'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Volatility Regime</span>
          </div>
          <div className="font-black text-sm text-amber-300 tracking-tight">
            {vol.replace('_', ' ')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {vol === 'NORMAL_VOLATILITY' ? 'Optimal expiry spread' : 'Filtered safety zone'}
          </div>
        </div>
      </div>

      {/* Sub-model agreement status */}
      <div className="mt-3 pt-3 border-t border-dark-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Consensus Layer:</span>
        </span>
        <span className="font-mono font-bold text-slate-200">
          {currentSignal ? currentSignal.modelAgreement.agreementRatio : 'Ready'} Consensus
        </span>
      </div>
    </div>
  );
};
