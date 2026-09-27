// src/components/signals/LiveSignalsView.tsx

import React, { useState } from 'react';
import { useSignals } from '../../context/SignalContext';
import { useMarket } from '../../context/MarketContext';
import { ActiveSignalCard } from '../dashboard/ActiveSignalCard';
import { Sparkles, Cpu, Layers, BarChart3, ShieldCheck, Share2, Info } from 'lucide-react';
import { TelegramService } from '../../services/telegramService';
import { useSettings } from '../../context/SettingsContext';

export const LiveSignalsView: React.FC = () => {
  const { currentSignal, generateSignal, isAnalyzing } = useSignals();
  const { selectedPair, selectedExpiry, currentPrice } = useMarket();
  const { settings } = useSettings();
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Live Signal Execution Terminal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time quantitative signal generation with 6-model ensemble consensus & non-lookahead indicators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTelegramPreview(!showTelegramPreview)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-dark-800 text-blue-300 border border-blue-900/50 hover:bg-dark-750 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Telegram Template Preview</span>
          </button>

          <button
            onClick={() => generateSignal()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-glow-call transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Generate New Signal'}</span>
          </button>
        </div>
      </div>

      {/* Main Signal Display */}
      {currentSignal ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Signal Card */}
          <div className="lg:col-span-7">
            <ActiveSignalCard signal={currentSignal} />
          </div>

          {/* Sub-Models & Technical Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            {/* Multi-Timeframe Alignment Matrix */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-white text-sm">Multi-Timeframe Structure</h4>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {currentSignal.multiTimeframe.alignment}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">1m Trend</div>
                  <div className="font-bold text-xs text-slate-200 mt-1 truncate">
                    {currentSignal.multiTimeframe.tf1m}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">5m Trend</div>
                  <div className="font-bold text-xs text-slate-200 mt-1 truncate">
                    {currentSignal.multiTimeframe.tf5m}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">15m Trend</div>
                  <div className="font-bold text-xs text-slate-200 mt-1 truncate">
                    {currentSignal.multiTimeframe.tf15m}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Ensemble Sub-Model Votes */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-white text-sm">AI Sub-Model Votes</h4>
                </div>
                <span className="text-xs font-mono font-bold text-purple-300">
                  {currentSignal.modelAgreement.agreementRatio} Consensus
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(currentSignal.modelVotes).map(([key, vote]) => {
                  const isCall = vote.direction === 'CALL';
                  const isPut = vote.direction === 'PUT';
                  const formattedName = key
                    .replace('Model', '')
                    .replace(/([A-Z])/g, ' $1')
                    .trim();

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl bg-dark-950/60 border border-dark-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 capitalize">{formattedName} Model</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{vote.reason}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{vote.score}%</span>
                        <span className={`px-2 py-0.5 rounded font-mono font-extrabold text-[10px] ${
                          isCall
                            ? 'bg-call/20 text-call border border-call/40'
                            : isPut
                            ? 'bg-put/20 text-put border border-put/40'
                            : 'bg-wait/20 text-wait border border-wait/40'
                        }`}>
                          {vote.direction}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Technical Scores Radar Breakdown */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-sm">Technical Weight Scores</h4>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Trend Agreement ({settings.weights.trendAgreement}%)</span>
                    <span className="font-mono font-bold text-slate-200">{currentSignal.technicalScores.trendScore}%</span>
                  </div>
                  <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${currentSignal.technicalScores.trendScore}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Momentum Flow ({settings.weights.momentum}%)</span>
                    <span className="font-mono font-bold text-slate-200">{currentSignal.technicalScores.momentumScore}%</span>
                  </div>
                  <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${currentSignal.technicalScores.momentumScore}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Price Action Structure ({settings.weights.priceAction}%)</span>
                    <span className="font-mono font-bold text-slate-200">{currentSignal.technicalScores.priceActionScore}%</span>
                  </div>
                  <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${currentSignal.technicalScores.priceActionScore}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>ML Predictive Score ({settings.weights.mlPrediction}%)</span>
                    <span className="font-mono font-bold text-slate-200">{currentSignal.technicalScores.mlPredictionScore}%</span>
                  </div>
                  <div className="w-full bg-dark-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${currentSignal.technicalScores.mlPredictionScore}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-dark-900 border border-dark-800">
          <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white">No Active Signal</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Click the button below to analyze market features and generate a live CALL or PUT signal for Quotex OTC.
          </p>
          <button
            onClick={() => generateSignal()}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-glow-call"
          >
            GENERATE SIGNAL NOW
          </button>
        </div>
      )}

      {/* Telegram Message Preview Modal */}
      {showTelegramPreview && currentSignal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-blue-500/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800 mb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" />
                Telegram Formatted Signal Message
              </h4>
              <button
                onClick={() => setShowTelegramPreview(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                Close ✕
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-96">
              {TelegramService.formatSignalMessage(currentSignal)}
            </pre>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-dark-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(TelegramService.formatSignalMessage(currentSignal));
                  alert('Telegram text copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Copy Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
