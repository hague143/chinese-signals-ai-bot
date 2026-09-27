// src/App.tsx

import React, { useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { MarketProvider } from './context/MarketContext';
import { SignalProvider } from './context/SignalContext';
import { TopNavbar, NavTab } from './components/layout/TopNavbar';
import { MarketTicker } from './components/layout/MarketTicker';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';

import { DashboardView } from './components/dashboard/DashboardView';
import { LiveSignalsView } from './components/signals/LiveSignalsView';
import { OTCScannerView } from './components/scanner/OTCScannerView';
import { PairAnalysisView } from './components/analysis/PairAnalysisView';
import { SignalHistoryView } from './components/history/SignalHistoryView';
import { PerformanceDashboardView } from './components/performance/PerformanceDashboardView';
import { BacktestView } from './components/backtest/BacktestView';
import { AIModelsView } from './components/models/AIModelsView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminPanelView } from './components/admin/AdminPanelView';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <TopNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Live Market Ticker */}
      <MarketTicker onSelectPair={() => setActiveTab('analysis')} />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 transition-all duration-200">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'signals' && <LiveSignalsView />}
        {activeTab === 'scanner' && <OTCScannerView onTradePair={() => setActiveTab('signals')} />}
        {activeTab === 'analysis' && <PairAnalysisView />}
        {activeTab === 'history' && <SignalHistoryView />}
        {activeTab === 'performance' && <PerformanceDashboardView />}
        {activeTab === 'backtest' && <BacktestView />}
        {activeTab === 'models' && <AIModelsView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'admin' && <AdminPanelView />}
      </main>

      {/* Mandatory Regulatory & Risk Disclaimer Banner */}
      <DisclaimerBanner />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <MarketProvider>
        <SignalProvider>
          <MainAppContent />
        </SignalProvider>
      </MarketProvider>
    </SettingsProvider>
  );
};

export default App;
