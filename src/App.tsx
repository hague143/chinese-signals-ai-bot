// src/App.tsx

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { MarketProvider } from './context/MarketContext';
import { SignalProvider } from './context/SignalContext';
import { TopNavbar, NavTab } from './components/layout/TopNavbar';
import { MarketTicker } from './components/layout/MarketTicker';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';

import { LoginView } from './components/auth/LoginView';
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
import { Cpu } from 'lucide-react';

const AppGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-900 border border-cyan-500/40 shadow-glow-cyan mb-4 animate-pulse">
          <Cpu className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="text-sm font-bold text-white tracking-wider uppercase font-mono">
          Verifying License Security
        </div>
        <div className="text-xs text-slate-500 font-mono mt-1">
          Connecting to Hardware Token Gate...
        </div>
      </div>
    );
  }

  // License Key Gate: Nothing loads until key is validated!
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Authenticated Main App
  return (
    <SettingsProvider>
      <MarketProvider>
        <SignalProvider>
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

            {/* Regulatory & Risk Disclaimer Banner */}
            <DisclaimerBanner />
          </div>
        </SignalProvider>
      </MarketProvider>
    </SettingsProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
};

export default App;
