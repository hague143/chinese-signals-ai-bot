// src/components/dashboard/RecentSignalsTable.tsx

import React from 'react';
import { MasterSignalOutput } from '../../types/signal';
import { useSignals } from '../../context/SignalContext';
import { Check, XCircle, MinusCircle, Clock, Trash2, ArrowUpRight, ArrowDownRight, PauseCircle } from 'lucide-react';

export const RecentSignalsTable: React.FC<{ onViewAllHistory?: () => void }> = ({ onViewAllHistory }) => {
  const { signalHistory, resolveSignal, deleteSignal } = useSignals();
  const recent = signalHistory.slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 text-center select-none">
        <p className="text-sm text-slate-400 font-medium">No signal generated yet.</p>
        <p className="text-xs text-slate-500 mt-1">Click "GENERATE SIGNAL" above to run the quantitative AI engine.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="font-bold text-white text-sm">Recent Signals Stream</h4>
        </div>
        <button
          onClick={onViewAllHistory}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
        >
          View Full History ({signalHistory.length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dark-800 text-[10px] uppercase font-bold text-slate-500">
              <th className="pb-2">Time</th>
              <th className="pb-2">Pair</th>
              <th className="pb-2">Direction</th>
              <th className="pb-2">Expiry</th>
              <th className="pb-2">Confidence</th>
              <th className="pb-2">Entry</th>
              <th className="pb-2">Outcome</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/60 font-mono">
            {recent.map(sig => {
              const isCall = sig.direction === 'CALL';
              const isPut = sig.direction === 'PUT';
              const timeStr = new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <tr key={sig.id} className="hover:bg-dark-850/50 transition-colors">
                  <td className="py-2.5 text-slate-400 text-[11px]">{timeStr}</td>
                  <td className="py-2.5 font-bold text-white font-sans">{sig.symbol}</td>
                  <td className="py-2.5">
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
                  <td className="py-2.5 text-slate-300 text-xs">{sig.expiry}</td>
                  <td className="py-2.5 font-bold text-cyan-300">{Math.round(sig.confidence)}%</td>
                  <td className="py-2.5 text-slate-300">{sig.entryPrice}</td>
                  <td className="py-2.5">
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
                  <td className="py-2.5 text-right font-sans">
                    <div className="flex items-center justify-end gap-1">
                      {sig.result === 'UNRESOLVED' && (
                        <>
                          <button
                            onClick={() => resolveSignal(sig.id, 'WIN')}
                            className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400"
                            title="Mark Win"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => resolveSignal(sig.id, 'LOSS')}
                            className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-400"
                            title="Mark Loss"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteSignal(sig.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
