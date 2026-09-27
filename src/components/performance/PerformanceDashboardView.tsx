// src/components/performance/PerformanceDashboardView.tsx

import React, { useMemo } from 'react';
import { useSignals } from '../../context/SignalContext';
import { useSettings } from '../../context/SettingsContext';
import { TrendingUp, Trophy, XCircle, BarChart3, PieChart, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export const PerformanceDashboardView: React.FC = () => {
  const { signalHistory } = useSignals();
  const { pairs } = useSettings();

  const metrics = useMemo(() => {
    const totalSignals = signalHistory.length;
    const callSignals = signalHistory.filter(s => s.direction === 'CALL').length;
    const putSignals = signalHistory.filter(s => s.direction === 'PUT').length;
    const waitSignals = signalHistory.filter(s => s.direction === 'WAIT').length;

    // Resolved only calculations
    const resolvedSignals = signalHistory.filter(s => s.result === 'WIN' || s.result === 'LOSS' || s.result === 'DRAW');
    const wins = resolvedSignals.filter(s => s.result === 'WIN').length;
    const losses = resolvedSignals.filter(s => s.result === 'LOSS').length;
    const draws = resolvedSignals.filter(s => s.result === 'DRAW').length;

    const winLossTotal = wins + losses;
    const winRate = winLossTotal > 0 ? (wins / winLossTotal) * 100 : 0;
    const lossRate = winLossTotal > 0 ? (losses / winLossTotal) * 100 : 0;

    const confidences = signalHistory.map(s => s.confidence);
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    const highestConfidence = confidences.length > 0 ? Math.max(...confidences) : 0;

    // Confidence Buckets vs Outcome (70-74, 75-79, 80-84, 85-89, 90+)
    const bucketsDef = [
      { min: 70, max: 74.9, range: '70%–74%' },
      { min: 75, max: 79.9, range: '75%–79%' },
      { min: 80, max: 84.9, range: '80%–84%' },
      { min: 85, max: 89.9, range: '85%–89%' },
      { min: 90, max: 100, range: '90%+' },
    ];

    const confidenceBuckets = bucketsDef.map(b => {
      const bResolved = resolvedSignals.filter(s => s.confidence >= b.min && s.confidence <= b.max);
      const bWins = bResolved.filter(s => s.result === 'WIN').length;
      const bLosses = bResolved.filter(s => s.result === 'LOSS').length;
      const bTotal = bWins + bLosses;
      const rate = bTotal > 0 ? (bWins / bTotal) * 100 : 0;
      return { range: b.range, total: bTotal, wins: bWins, losses: bLosses, winRate: Math.round(rate * 10) / 10 };
    });

    // Performance by Expiry
    const expiries = ['5s', '10s', '15s', '30s', '45s', '1m'] as const;
    const expiryBreakdown = expiries.map(exp => {
      const eResolved = resolvedSignals.filter(s => s.expiry === exp);
      const eWins = eResolved.filter(s => s.result === 'WIN').length;
      const eLosses = eResolved.filter(s => s.result === 'LOSS').length;
      const eTotal = eWins + eLosses;
      const rate = eTotal > 0 ? (eWins / eTotal) * 100 : 0;
      return { expiry: exp, total: eTotal, wins: eWins, losses: eLosses, winRate: Math.round(rate * 10) / 10 };
    });

    // Performance by Market Regime
    const regimes = ['TRENDING', 'RANGING', 'BREAKOUT', 'LOW_VOLATILITY', 'HIGH_VOLATILITY', 'UNCERTAIN'];
    const regimeBreakdown = regimes.map(reg => {
      const rResolved = resolvedSignals.filter(s => s.marketRegime === reg);
      const rWins = rResolved.filter(s => s.result === 'WIN').length;
      const rLosses = rResolved.filter(s => s.result === 'LOSS').length;
      const rTotal = rWins + rLosses;
      const rate = rTotal > 0 ? (rWins / rTotal) * 100 : 0;
      return { regime: reg, total: rTotal, wins: rWins, losses: rLosses, winRate: Math.round(rate * 10) / 10 };
    });

    return {
      totalSignals,
      callSignals,
      putSignals,
      waitSignals,
      resolvedCount: resolvedSignals.length,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 10) / 10,
      lossRate: Math.round(lossRate * 10) / 10,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      highestConfidence: Math.round(highestConfidence * 10) / 10,
      confidenceBuckets,
      expiryBreakdown,
      regimeBreakdown,
    };
  }, [signalHistory]);

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span>AI Quantitative Performance Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Realized performance metrics calculated strictly from resolved signal outcomes. Zero fabricated win rates.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-dark-950 px-3 py-1.5 rounded-xl border border-dark-800">
          <span className="text-slate-500">Sample Size:</span>
          <span className="font-bold text-cyan-300">{metrics.resolvedCount} Resolved Trades</span>
        </div>
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase text-[10px]">Realized Win Rate</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            {metrics.winRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics.wins} Wins / {metrics.losses} Losses
          </div>
        </div>

        {/* Total Generated */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase text-[10px]">Total Signals</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {metrics.totalSignals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics.callSignals} CALL • {metrics.putSignals} PUT • {metrics.waitSignals} WAIT
          </div>
        </div>

        {/* Average Confidence */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase text-[10px]">Avg Model Confidence</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black font-mono text-purple-300">
            {metrics.avgConfidence}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Peak: {metrics.highestConfidence}%
          </div>
        </div>

        {/* Drawdown / Loss Rate */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase text-[10px]">Loss Rate</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black font-mono text-rose-400">
            {metrics.lossRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics.draws} Neutral Draws
          </div>
        </div>
      </div>

      {/* Confidence vs Outcome (Section 14 requirement) */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Confidence vs. Empirical Outcome</h3>
            <p className="text-xs text-slate-400">
              Validating whether higher AI confidence scores correlate with higher historical win rates.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 font-mono text-xs border border-cyan-800">
            Ensemble Calibration
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {metrics.confidenceBuckets.map(b => (
            <div key={b.range} className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-center">
              <div className="text-xs font-mono font-bold text-slate-400 mb-1">{b.range}</div>
              <div className={`text-xl font-black font-mono ${
                b.winRate >= 70 ? 'text-emerald-400' : b.winRate >= 55 ? 'text-cyan-300' : 'text-slate-400'
              }`}>
                {b.total > 0 ? `${b.winRate}%` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                {b.wins}W / {b.losses}L ({b.total} trades)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expiry & Market Regime Performance Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Performance by Expiry Timer */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <h3 className="font-bold text-white text-sm mb-3">Performance by Expiry Duration</h3>
          <div className="space-y-2 font-mono text-xs">
            {metrics.expiryBreakdown.map(e => (
              <div key={e.expiry} className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-dark-800 text-cyan-300 font-bold text-xs">
                    {e.expiry}
                  </span>
                  <span className="text-slate-400 text-[11px]">({e.total} trades)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px]">{e.wins}W - {e.losses}L</span>
                  <span className={`font-bold ${e.winRate >= 65 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {e.total > 0 ? `${e.winRate}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance by Market Regime */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
          <h3 className="font-bold text-white text-sm mb-3">Performance by Market Regime</h3>
          <div className="space-y-2 font-mono text-xs">
            {metrics.regimeBreakdown.map(r => (
              <div key={r.regime} className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-bold font-sans text-xs">
                    {r.regime}
                  </span>
                  <span className="text-slate-500 text-[11px]">({r.total} trades)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px]">{r.wins}W - {r.losses}L</span>
                  <span className={`font-bold ${r.winRate >= 65 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {r.total > 0 ? `${r.winRate}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
