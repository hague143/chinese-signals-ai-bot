// src/components/layout/TopNavbar.tsx

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Search,
  LineChart,
  History,
  TrendingUp,
  Cpu,
  Sliders,
  Shield,
  Radio,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Bot,
  Flame,
  LogOut,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'signals'
  | 'scanner'
  | 'analysis'
  | 'history'
  | 'performance'
  | 'backtest'
  | 'models'
  | 'settings'
  | 'admin';

interface TopNavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeTab, setActiveTab }) => {
  const { marketStatus } = useMarket();
  const { settings, updateSettings } = useSettings();
  const { license, logout } = useAuth();
  const [localTime, setLocalTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'signals', label: 'Signals', icon: <Flame className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'scanner', label: 'OTC Scanner', icon: <Search className="w-4 h-4" /> },
    { id: 'analysis', label: 'Pair Analysis', icon: <LineChart className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'backtest', label: 'Backtest', icon: <Layers className="w-4 h-4" /> },
    { id: 'models', label: 'AI Models', icon: <Cpu className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" />, badge: 'KEYS' },
  ];

  // Expiry badge label
  let expiryLabel = 'Active License';
  let expiryColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';

  if (license) {
    if (license.isLifetime) {
      expiryLabel = 'Lifetime Access';
      expiryColor = 'bg-purple-950/80 text-purple-300 border-purple-800/60';
    } else if (license.daysRemaining !== null) {
      if (license.daysRemaining <= 1) {
        expiryLabel = 'Expires in < 24 Hours';
        expiryColor = 'bg-rose-950/80 text-rose-300 border-rose-800/60 animate-pulse';
      } else if (license.daysRemaining <= 3) {
        expiryLabel = `Expires in ${license.daysRemaining} days`;
        expiryColor = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      } else {
        expiryLabel = `Expires in ${license.daysRemaining} days`;
        expiryColor = 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      }
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out from this device?')) {
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-dark-900/90 backdrop-blur-xl border-b border-dark-700/70 select-none">
      {/* Top micro bar */}
      <div className="px-4 py-1.5 bg-dark-950/90 border-b border-dark-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Broker:</span>
            <span className="font-bold text-slate-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Quotex
            </span>
          </div>

          <div className="h-3 w-px bg-dark-700 hidden sm:block"></div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Market:</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-semibold text-[11px] border border-cyan-800/60">
              OTC Markets
            </span>
          </div>

          <div className="h-3 w-px bg-dark-700 hidden md:block"></div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-500">Data Feed:</span>
            <span className={`flex items-center gap-1 font-semibold ${
              marketStatus.isDemo ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isDemo ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              {marketStatus.isDemo ? 'DEMO SIMULATOR (99.8% Sync)' : 'AUTHORIZED STREAM'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{localTime}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{utcTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSettings({ soundAlertsEnabled: !settings.soundAlertsEnabled })}
              className={`p-1 rounded transition-colors ${
                settings.soundAlertsEnabled ? 'text-cyan-400 hover:bg-cyan-950/50' : 'text-slate-500 hover:bg-dark-800'
              }`}
              title={settings.soundAlertsEnabled ? 'Audio alerts enabled' : 'Audio muted'}
            >
              {settings.soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-300 font-mono">
              <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span>{marketStatus.latencyMs}ms</span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/50 text-[11px] text-purple-300 font-mono">
              <Bot className="w-3 h-3 text-purple-400" />
              <span>AI Ensemble v4.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-dark-800 to-dark-900 border border-cyan-500/40 shadow-glow-cyan">
            <div className="text-cyan-400 font-black text-xl font-mono tracking-tighter group-hover:scale-110 transition-transform">
              中
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                CHINESE SIGNALS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 font-black">AI BOT</span>
              </h1>
              <span className="px-1.5 py-0.2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded">
                QUOTEX OTC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              AI-Powered OTC Trading Signal Analysis
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-dark-950/60 p-1 rounded-xl border border-dark-800">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`px-1 py-0.2 text-[9px] font-bold rounded border ${
                    item.badge === 'LIVE' ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* License Expiry Badge & Logout Action */}
        <div className="flex items-center gap-2.5">
          {/* Expiry Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border shadow-sm ${expiryColor}`}
            title={license?.key ? `Key: ${license.key}` : 'License Active'}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{expiryLabel}</span>
          </div>

          <button
            onClick={() => setActiveTab('scanner')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 text-slate-200 hover:bg-dark-700 border border-dark-700 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scan OTC</span>
          </button>

          <button
            onClick={() => setActiveTab('signals')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-glow-call transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GENERATE SIGNAL</span>
            <span className="sm:hidden">SIGNAL</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-dark-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-dark-700 hover:border-rose-800/50 transition-colors"
            title="Log out and unbind session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Scroller */}
      <div className="xl:hidden flex items-center justify-between gap-1 px-3 py-1.5 overflow-x-auto border-t border-dark-800/80 bg-dark-950/70 scrollbar-none">
        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Expiry pill */}
        <div className={`sm:hidden px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap border ${expiryColor}`}>
          {expiryLabel}
        </div>
      </div>
    </header>
  );
};
