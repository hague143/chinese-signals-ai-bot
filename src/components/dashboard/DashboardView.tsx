// src/components/dashboard/DashboardView.tsx

import React from 'react';
import { LiveMarketHeader } from './LiveMarketHeader';
import { QuickSignalSection } from './QuickSignalSection';
import { ActiveSignalCard } from './ActiveSignalCard';
import { MiniScannerWidget } from './MiniScannerWidget';
import { MarketRegimeOverview } from './MarketRegimeOverview';
import { RecentSignalsTable } from './RecentSignalsTable';
import { useSignals } from '../../context/SignalContext';
import { useMarket } from '../../context/MarketContext';
import { NavTab } from '../layout/TopNavbar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentSignal, activeSignal, isCountdownActive } = useSignals();
  const { selectedPair } = useMarket();

  return (
    <div className="space-y-5 select-none">
      {/* Live Market Header */}
      <LiveMarketHeader />

      {/* Main Signal Generation Panel */}
      <QuickSignalSection onScanClick={() => onNavigate('scanner')} />

      {/* Hero Active Signal Card (if present) */}
      {currentSignal && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isCountdownActive ? '● Active Live Trade Signal' : 'Latest Generated Analytical Signal'}
            </span>
            <button
              onClick={() => onNavigate('signals')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Full Analysis Screen →
            </button>
          </div>
          <ActiveSignalCard signal={currentSignal} />
        </div>
      )}

      {/* 2-Column Grid: Mini Scanner + Market Regime */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <MiniScannerWidget onViewAll={() => onNavigate('scanner')} />
        </div>
        <div className="lg:col-span-5">
          <MarketRegimeOverview />
        </div>
      </div>

      {/* Recent Signals Stream */}
      <RecentSignalsTable onViewAllHistory={() => onNavigate('history')} />
    </div>
  );
};
