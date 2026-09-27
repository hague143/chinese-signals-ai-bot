// src/components/history/SignalHistoryView.tsx

import React, { useState } from 'react';
import { useSignals } from '../../context/SignalContext';
import { useSettings } from '../../context/SettingsContext';
import { MasterSignalOutput, SignalOutcome, SignalDirection } from '../../types/signal';
import { ExpiryDuration } from '../../types/market';
import {
  History,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  PauseCircle,
  Calendar,
} from 'lucide-react';

export const SignalHistoryView: React.FC = () => {
  const { signalHistory, resolveSignal, deleteSignal, clearHistory } = useSignals();
  const { pairs } = useSettings();

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | '7D' | '30D'>('ALL');
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [dirFilter, setDirFilter] = useState<'ALL' | SignalDirection>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | ExpiryDuration>('ALL');
  const [resultFilter, setResultFilter] = useState<'ALL' | SignalOutcome>('ALL');
  const [selectedSignalForAudit, setSelectedSignalForAudit] = useState<MasterSignalOutput | null>(null);

  // Date filtering logic
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday - oneDayMs;

  const filteredSignals = signalHistory.filter(sig => {
    // Date filter
    if (dateFilter === 'TODAY' && sig.timestamp < startOfToday) return false;
    if (dateFilter === 'YESTERDAY' && (sig.timestamp < startOfYesterday || sig.timestamp >= startOfToday)) return false;
    if (dateFilter === '7D' && sig.timestamp < now - 7 * oneDayMs) return false;
    if (dateFilter === '30D' && sig.timestamp < now - 30 * oneDayMs) return false;

    // Pair filter
    if (pairFilter !== 'ALL' && sig.symbol !== pairFilter) return false;

    // Direction filter
    if (dirFilter !== 'ALL' && sig.direction !== dirFilter) return false;

    // Expiry filter
    if (expiryFilter !== 'ALL' && sig.expiry !== expiryFilter) return false;

    // Result filter
    if (resultFilter !== 'ALL' && sig.result !== resultFilter) return false;

    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (filteredSignals.length === 0) return;

    const headers = ['ID', 'Timestamp', 'Symbol', 'Direction', 'Expiry', 'Confidence', 'EntryPrice', 'ExitPrice', 'Result', 'Trend', 'MarketRegime'];
    const rows = filteredSignals.map(s => [
      s.id,
      new Date(s.timestamp).toISOString(),
      s.symbol,
      s.direction,
      s.expiry,
      s.confidence,
      s.entryPrice,
      s.exitPrice || '',
      s.result,
      s.trend,
      s.marketRegime,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chinese_signals_ai_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 select-none">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Signal Audit & History Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all generated CALL, PUT, and WAIT signals with exact analytical features and recorded outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredSignals.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-dark-800 text-slate-200 border border-dark-700 hover:bg-dark-750 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          {signalHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all signal history?')) clearHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Control Ribbon */}
      <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 flex flex-wrap items-center gap-3 text-xs">
        {/* Date Filter Tabs */}
        <div className="flex items-center bg-dark-950 p-1 rounded-xl border border-dark-800">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1 mr-2" />
          {(['ALL', 'TODAY', 'YESTERDAY', '7D', '30D'] as const).map(df => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                dateFilter === df ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              {df === 'ALL' ? 'All Time' : df === 'TODAY' ? 'Today' : df === 'YESTERDAY' ? 'Yesterday' : df === '7D' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>

        {/* Pair Filter Dropdown */}
        <select
          value={pairFilter}
          onChange={e => setPairFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-dark-750 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All OTC Pairs</option>
          {pairs.map(p => (
            <option key={p.id} value={p.symbol}>{p.displayName}</option>
          ))}
        </select>

        {/* Direction Filter */}
        <select
          value={dirFilter}
          onChange={e => setDirFilter(e.target.value as any)}
          className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-dark-750 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Directions</option>
          <option value="CALL">CALL 🟢</option>
          <option value="PUT">PUT 🔴</option>
          <option value="WAIT">WAIT 🟡</option>
        </select>

        {/* Expiry Filter */}
        <select
          value={expiryFilter}
          onChange={e => setExpiryFilter(e.target.value as any)}
          className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-dark-750 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Expiries</option>
          <option value="5s">5 Seconds</option>
          <option value="10s">10 Seconds</option>
          <option value="15s">15 Seconds</option>
          <option value="30s">30 Seconds</option>
          <option value="45s">45 Seconds</option>
          <option value="1m">1 Minute</option>
        </select>

        {/* Result Filter */}
        <select
          value={resultFilter}
          onChange={e => setResultFilter(e.target.value as any)}
          className="px-2.5 py-1.5 rounded-xl bg-dark-950 border border-dark-750 text-slate-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Outcomes</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="DRAW">DRAW</option>
          <option value="UNRESOLVED">UNRESOLVED</option>
        </select>
      </div>

      {/* Signals Table */}
      <div className="rounded-2xl bg-dark-900 border border-dark-750 shadow-card overflow-hidden">
        {filteredSignals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold">No signals match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-800 bg-dark-950/70 text-[10px] uppercase font-bold text-slate-400 font-mono">
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-3">PAIR</th>
                  <th className="py-3 px-3">SIGNAL</th>
                  <th className="py-3 px-3">EXPIRY</th>
                  <th className="py-3 px-3">CONFIDENCE</th>
                  <th className="py-3 px-3">ENTRY</th>
                  <th className="py-3 px-3">EXIT</th>
                  <th className="py-3 px-3">OUTCOME</th>
                  <th className="py-3 px-4 text-right">AUDIT / ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60 font-mono">
                {filteredSignals.map(sig => {
                  const isCall = sig.direction === 'CALL';
                  const isPut = sig.direction === 'PUT';
                  const timeStr = new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = new Date(sig.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={sig.id} className="hover:bg-dark-850/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400">
                        <div className="text-white font-semibold">{timeStr}</div>
                        <div className="text-[10px] text-slate-500">{dateStr}</div>
                      </td>

                      <td className="py-3 px-3 font-bold text-white font-sans">{sig.symbol}</td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] inline-flex items-center gap-1 ${
                          isCall
                            ? 'bg-call/20 text-call border border-call/30'
                            : isPut
                            ? 'bg-put/20 text-put border border-put/30'
                            : 'bg-wait/20 text-wait border border-wait/30'
                        }`}>
                          {isCall ? <ArrowUpRight className="w-3 h-3" /> : isPut ? <ArrowDownRight className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                          {sig.direction}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300">{sig.expiry}</td>

                      <td className="py-3 px-3 font-bold text-cyan-300">{Math.round(sig.confidence)}%</td>

                      <td className="py-3 px-3 text-slate-300">{sig.entryPrice}</td>

                      <td className="py-3 px-3 text-slate-400">{sig.exitPrice || '-'}</td>

                      <td className="py-3 px-3">
                        {sig.result === 'WIN' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800/60 text-[10px]">
                            WIN ✓
                          </span>
                        ) : sig.result === 'LOSS' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-bold border border-rose-800/60 text-[10px]">
                            LOSS ✗
                          </span>
                        ) : sig.result === 'DRAW' ? (
                          <span className="px-2 py-0.5 rounded bg-dark-800 text-slate-400 font-bold text-[10px]">
                            DRAW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 font-bold border border-amber-800/50 text-[10px]">
                            PENDING
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSignalForAudit(sig)}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Inspect Deep AI Audit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {sig.result === 'UNRESOLVED' && (
                            <>
                              <button
                                onClick={() => resolveSignal(sig.id, 'WIN')}
                                className="px-1.5 py-1 rounded bg-emerald-950 text-emerald-400 hover:bg-emerald-900 text-[10px] font-bold"
                              >
                                WIN
                              </button>
                              <button
                                onClick={() => resolveSignal(sig.id, 'LOSS')}
                                className="px-1.5 py-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 text-[10px] font-bold"
                              >
                                LOSS
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => deleteSignal(sig.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Signal Audit Modal */}
      {selectedSignalForAudit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Signal Forensic Audit:</span>
                <span className="font-mono text-cyan-400">{selectedSignalForAudit.id}</span>
              </h3>
              <button
                onClick={() => setSelectedSignalForAudit(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Symbol</div>
                <div className="font-bold text-white">{selectedSignalForAudit.symbol}</div>
              </div>

              <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Direction</div>
                <div className="font-bold text-cyan-300">{selectedSignalForAudit.direction}</div>
              </div>

              <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Confidence</div>
                <div className="font-bold text-emerald-400">{Math.round(selectedSignalForAudit.confidence)}%</div>
              </div>

              <div className="p-2 rounded-xl bg-dark-950 border border-dark-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Outcome</div>
                <div className="font-bold text-amber-300">{selectedSignalForAudit.result}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs">
              <div className="font-bold text-slate-400 uppercase text-[10px] mb-2">AI Sub-Model Votes</div>
              <div className="space-y-1.5">
                {Object.entries(selectedSignalForAudit.modelVotes).map(([mName, v]) => (
                  <div key={mName} className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-300 capitalize">{mName.replace('Model', '')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{v.score}%</span>
                      <span className="font-bold text-cyan-300">{v.direction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs">
              <div className="font-bold text-slate-400 uppercase text-[10px] mb-1.5">Analytical Reasons</div>
              <ul className="space-y-1 text-slate-300">
                {selectedSignalForAudit.analysisReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSignalForAudit(null)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-bold text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
