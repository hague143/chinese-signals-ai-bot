// src/components/backtest/BacktestView.tsx

import React, { useState } from 'react';
import { Layers, Play, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, ShieldAlert } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useSettings } from '../../context/SettingsContext';
import { BacktestEngine } from '../../engine/backtestEngine';
import { BacktestConfig, BacktestResult } from '../../types/backtest';
import { ExpiryDuration } from '../../types/market';
import { StorageService } from '../../services/storageService';

export const BacktestView: React.FC = () => {
  const { pairs, settings } = useSettings();
  const { provider } = useMarket();

  const [selectedSymbol, setSelectedSymbol] = useState<string>(pairs[0]?.symbol || 'EUR/USD OTC');
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryDuration>('30s');
  const [candlesCount, setCandlesCount] = useState<number>(200);
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [requireMtf, setRequireMtf] = useState<boolean>(true);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(() => {
    const runs = StorageService.getBacktests();
    return runs[0] || null;
  });

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      // Fetch historical candles from provider
      const historicalCandles = await provider.getCandles(selectedSymbol, '1m', candlesCount);
      
      const config: BacktestConfig = {
        symbol: selectedSymbol,
        expiry: selectedExpiry,
        candlesCount,
        minConfidence,
        requireMtf,
      };

      const res = BacktestEngine.runBacktest(historicalCandles, config, settings);
      setResult(res);
      StorageService.saveBacktest(res);
    } catch (err: any) {
      alert(err.message || 'Backtesting execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Walk-Forward Backtesting Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict chronological simulation bar-by-bar with zero look-ahead bias. Future candles are never exposed to feature extraction.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-amber-300 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-800/60">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>No Lookahead Guarantee Active</span>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Pair Select */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">OTC Symbol</label>
            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              {pairs.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.symbol}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* Expiry Select */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expiry Timer</label>
            <select
              value={selectedExpiry}
              onChange={e => setSelectedExpiry(e.target.value as ExpiryDuration)}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="5s">5 Seconds</option>
              <option value="10s">10 Seconds</option>
              <option value="15s">15 Seconds</option>
              <option value="30s">30 Seconds</option>
              <option value="45s">45 Seconds</option>
              <option value="1m">1 Minute</option>
            </select>
          </div>

          {/* Historical Bars */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">History Depth</label>
            <select
              value={candlesCount}
              onChange={e => setCandlesCount(Number(e.target.value))}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={100}>100 Bars</option>
              <option value={200}>200 Bars</option>
              <option value={300}>300 Bars</option>
              <option value={500}>500 Bars</option>
            </select>
          </div>

          {/* Min Confidence Threshold */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min Confidence</label>
            <select
              value={minConfidence}
              onChange={e => setMinConfidence(Number(e.target.value))}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={65}>65%+</option>
              <option value={70}>70%+</option>
              <option value={75}>75%+ (Default)</option>
              <option value={80}>80%+</option>
              <option value={85}>85%+</option>
            </select>
          </div>

          {/* Run Button */}
          <div className="flex items-end">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wide bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-glow-cyan transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'SIMULATING...' : 'RUN SIMULATION'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backtest Results View */}
      {result ? (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] font-bold uppercase text-slate-500">Historical Win Rate</div>
              <div className={`text-2xl font-black font-mono mt-0.5 ${result.winRate >= 60 ? 'text-emerald-400' : 'text-slate-200'}`}>
                {result.winRate}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{result.wins}W / {result.losses}L</div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] font-bold uppercase text-slate-500">Total Valid Trades</div>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {result.totalSignals}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{result.filteredWaitCount} Wait Filtered</div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] font-bold uppercase text-slate-500">Profit Factor</div>
              <div className="text-2xl font-black font-mono text-purple-300 mt-0.5">
                {result.profitFactor}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Max DD: {result.maxDrawdownPct}%</div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] font-bold uppercase text-slate-500">Max Win Streak</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                {result.maxConsecutiveWins} Consecutive
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Max Loss Streak: {result.maxConsecutiveLosses}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-750">
              <div className="text-[10px] font-bold uppercase text-slate-500">Avg Confidence</div>
              <div className="text-2xl font-black font-mono text-cyan-300 mt-0.5">
                {result.avgConfidence}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">85% Payout Simulation</div>
            </div>
          </div>

          {/* Equity Curve SVG Mini Chart */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
            <h3 className="font-bold text-white text-sm mb-3">Simulated Equity Curve ($10 Flat Stake per Signal)</h3>
            <div className="h-32 w-full flex items-end gap-1 pt-4 pb-1">
              {result.equityCurve.map((pt, i) => {
                const minEq = Math.min(...result.equityCurve.map(e => e.equity));
                const maxEq = Math.max(...result.equityCurve.map(e => e.equity), 1001);
                const range = Math.max(1, maxEq - minEq);
                const heightPct = Math.max(10, ((pt.equity - minEq) / range) * 100);

                return (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-cyan-600/30 to-cyan-400 rounded-t hover:bg-cyan-300 transition-colors relative group"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 bg-black text-cyan-300 text-[9px] font-mono rounded whitespace-nowrap z-10">
                      ${pt.equity} ({pt.time})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confidence vs Historical Win Rate Buckets */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
            <h3 className="font-bold text-white text-sm mb-3">Confidence Range vs. Historical Win Rate</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {result.confidenceBuckets.map(b => (
                <div key={b.range} className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-center">
                  <div className="text-[11px] font-mono text-slate-400">{b.range}</div>
                  <div className={`text-xl font-black font-mono my-1 ${b.winRate >= 60 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {b.total > 0 ? `${b.winRate}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{b.wins}W / {b.losses}L</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Log Table */}
          <div className="rounded-2xl bg-dark-900 border border-dark-750 shadow-card overflow-hidden">
            <div className="p-3.5 border-b border-dark-800 font-bold text-sm text-white">
              Chronological Trade Log ({result.trades.length} trades)
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-950 sticky top-0 border-b border-dark-800 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Entry</th>
                    <th className="py-2.5 px-3">Exit</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-4 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/60">
                  {result.trades.map(t => (
                    <tr key={t.id} className="hover:bg-dark-850/50">
                      <td className="py-2 px-4 text-slate-400 text-[11px]">{t.timeFormatted}</td>
                      <td className="py-2 px-3 font-bold">
                        <span className={t.direction === 'CALL' ? 'text-call' : 'text-put'}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-300">{Math.round(t.confidence)}%</td>
                      <td className="py-2 px-3 text-slate-300">{t.entryPrice}</td>
                      <td className="py-2 px-3 text-slate-300">{t.exitPrice}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.outcome === 'WIN' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {t.outcome}
                        </span>
                      </td>
                      <td className={`py-2 px-4 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl >= 0 ? `+$${t.pnl}` : `-$${Math.abs(t.pnl)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-dark-900 border border-dark-800">
          <Layers className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">No Simulation Run Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Select your desired OTC instrument and parameters above, then click "RUN SIMULATION" to perform a non-lookahead walk-forward test.
          </p>
        </div>
      )}
    </div>
  );
};
