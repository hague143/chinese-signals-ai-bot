// src/components/dashboard/ActiveSignalCard.tsx

import React, { useState } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  PauseCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Trophy,
  XCircle,
  MinusCircle,
  Send,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MasterSignalOutput } from '../../types/signal';
import { useSignals } from '../../context/SignalContext';
import { useMarket } from '../../context/MarketContext';
import { TelegramService } from '../../services/telegramService';
import { useSettings } from '../../context/SettingsContext';

interface ActiveSignalCardProps {
  signal: MasterSignalOutput;
  onAnalyzeAgain?: () => void;
}

export const ActiveSignalCard: React.FC<ActiveSignalCardProps> = ({ signal, onAnalyzeAgain }) => {
  const { countdownRemaining, isCountdownActive, isExpired, resolveSignal, generateSignal, isAnalyzing } = useSignals();
  const { currentPrice } = useMarket();
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  const isCall = signal.direction === 'CALL';
  const isPut = signal.direction === 'PUT';
  const isWait = signal.direction === 'WAIT';

  const timeGen = new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const timeValid = new Date(signal.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Progress percentage for countdown
  const progressPct = signal.expirySeconds > 0 ? (countdownRemaining / signal.expirySeconds) * 100 : 0;

  const handleCopy = () => {
    const formatted = TelegramService.formatSignalMessage(signal);
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTelegram = async () => {
    if (!settings.telegram.botToken || !settings.telegram.chatId) {
      setTelegramStatus('Configure Telegram in Settings first');
      setTimeout(() => setTelegramStatus(null), 3000);
      return;
    }
    const res = await TelegramService.sendSignalAlert(signal, settings.telegram.botToken, settings.telegram.chatId);
    setTelegramStatus(res.success ? 'Sent to Telegram ✓' : 'Telegram Send Failed');
    setTimeout(() => setTelegramStatus(null), 3000);
  };

  // Card theme styling
  let cardBorder = 'border-wait-border shadow-glow-wait';
  let badgeBg = 'bg-wait/20 text-wait border-wait/40';
  let dirIcon = <PauseCircle className="w-10 h-10 text-wait animate-pulse" />;
  let dirText = 'WAIT / STANDBY';
  let dirSub = 'Insufficient consensus or unfavorable conditions';

  if (isCall) {
    cardBorder = 'border-call/50 shadow-glow-call bg-gradient-to-b from-dark-900 via-call-bg/30 to-dark-900';
    badgeBg = 'bg-call/20 text-call border-call/40';
    dirIcon = <ArrowUpCircle className="w-12 h-12 text-call animate-bounce" />;
    dirText = 'CALL';
    dirSub = 'PREDICTED UPWARD MOVEMENT (HIGHER)';
  } else if (isPut) {
    cardBorder = 'border-put/50 shadow-glow-put bg-gradient-to-b from-dark-900 via-put-bg/30 to-dark-900';
    badgeBg = 'bg-put/20 text-put border-put/40';
    dirIcon = <ArrowDownCircle className="w-12 h-12 text-put animate-bounce" />;
    dirText = 'PUT';
    dirSub = 'PREDICTED DOWNWARD MOVEMENT (LOWER)';
  }

  // Result badge if already resolved
  const isResolved = signal.result && signal.result !== 'UNRESOLVED';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-dark-900 border ${cardBorder} p-5 transition-all duration-300 select-none`}>
      {/* Background ambient lighting */}
      <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
        isCall ? 'bg-call' : isPut ? 'bg-put' : 'bg-wait'
      }`} />

      {/* Top Banner: Pair & Live Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-dark-750">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-dark-800 text-white font-mono font-bold text-sm border border-dark-700">
            {signal.symbol}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-dark-800/80 text-cyan-300 font-mono text-xs border border-cyan-800/50">
            {signal.expiry} ({signal.expirySeconds}s)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-dark-800/80 text-slate-400 font-mono text-[11px]">
            {signal.marketType}
          </span>
        </div>

        {/* Live Countdown Badge */}
        <div className="flex items-center gap-2">
          {isCountdownActive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-dark-950 border border-cyan-500/40 shadow-sm">
              <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">SIGNAL ACTIVE</span>
                <span className="text-base font-mono font-black text-white leading-none">
                  00:{countdownRemaining < 10 ? `0${countdownRemaining}` : countdownRemaining}
                </span>
              </div>
            </div>
          ) : isExpired ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              SIGNAL EXPIRED
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">Standby</div>
          )}
        </div>
      </div>

      {/* Countdown Progress Bar */}
      {isCountdownActive && (
        <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden my-3">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isCall ? 'bg-call' : isPut ? 'bg-put' : 'bg-wait'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Hero Signal Direction & Confidence Meter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-4 items-center">
        {/* Direction Hero Box */}
        <div className="md:col-span-7 flex items-center gap-4 p-4 rounded-xl bg-dark-950/70 border border-dark-800">
          <div>{dirIcon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black font-mono tracking-wider ${
                isCall ? 'text-call' : isPut ? 'text-put' : 'text-wait'
              }`}>
                {dirText}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide uppercase border ${badgeBg}`}>
                {signal.signalStrength}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{dirSub}</p>
          </div>
        </div>

        {/* Calculated Confidence Score */}
        <div className="md:col-span-5 p-4 rounded-xl bg-dark-950/70 border border-dark-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Calculated Confidence
            </span>
            <span className="text-slate-500 font-mono text-[10px]">No Hardcoded Bias</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono tracking-tight ${
              signal.confidence >= 80 ? 'text-emerald-400' : signal.confidence >= 70 ? 'text-cyan-400' : 'text-amber-400'
            }`}>
              {Math.round(signal.confidence)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({signal.modelAgreement.agreementRatio} AI Consensus)
            </span>
          </div>

          {/* Confidence Meter Line */}
          <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                signal.confidence >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : signal.confidence >= 70
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
        <div className="p-2.5 rounded-xl bg-dark-850/80 border border-dark-750">
          <div className="text-[10px] uppercase font-bold text-slate-500">Entry Reference</div>
          <div className="font-mono font-bold text-sm text-slate-100 mt-0.5">{signal.entryPrice}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-850/80 border border-dark-750">
          <div className="text-[10px] uppercase font-bold text-slate-500">Market Regime</div>
          <div className="font-semibold text-xs text-cyan-300 mt-0.5 truncate">{signal.marketRegime}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-850/80 border border-dark-750">
          <div className="text-[10px] uppercase font-bold text-slate-500">AI Agreement</div>
          <div className="font-mono font-bold text-sm text-purple-300 mt-0.5">{signal.modelAgreement.agreementRatio} Models</div>
        </div>

        <div className="p-2.5 rounded-xl bg-dark-850/80 border border-dark-750">
          <div className="text-[10px] uppercase font-bold text-slate-500">Risk Assessment</div>
          <div className={`font-semibold text-xs mt-0.5 ${
            signal.riskStatus === 'LOW' ? 'text-emerald-400' : signal.riskStatus === 'NORMAL' ? 'text-slate-200' : 'text-amber-400'
          }`}>
            {signal.riskStatus} RISK
          </div>
        </div>
      </div>

      {/* Structured Analysis Reasons */}
      <div className="my-4 p-3.5 rounded-xl bg-dark-950/60 border border-dark-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Analytical Evidence
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Generated at {timeGen}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {signal.analysisReasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{reason}</span>
            </div>
          ))}
        </div>

        {signal.explanationText && (
          <div className="mt-3 pt-2.5 border-t border-dark-800 text-[11px] text-slate-400 leading-relaxed italic">
            "{signal.explanationText}"
          </div>
        )}
      </div>

      {/* Outcome Resolution Banner if Resolved */}
      {isResolved && (
        <div className={`my-3 p-3 rounded-xl border flex items-center justify-between ${
          signal.result === 'WIN'
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            : signal.result === 'LOSS'
            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            {signal.result === 'WIN' ? <Trophy className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            <div>
              <div className="font-bold text-sm">Outcome: {signal.result}</div>
              <div className="text-[11px] opacity-80 font-mono">
                Entry: {signal.entryPrice} → Exit: {signal.exitPrice || currentPrice}
              </div>
            </div>
          </div>
          <span className="font-mono text-xs font-bold">Resolved</span>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-dark-750">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'COPY SIGNAL'}</span>
          </button>

          <button
            onClick={handleSendTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 transition-colors"
            title="Dispatch formatted signal to Telegram"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>{telegramStatus || 'TELEGRAM'}</span>
          </button>

          <button
            onClick={() => {
              if (onAnalyzeAgain) onAnalyzeAgain();
              else generateSignal();
            }}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-cyan-300 border border-cyan-800/40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>ANALYZE AGAIN</span>
          </button>
        </div>

        {/* Manual Outcome Mark Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 hidden sm:inline">Record Result:</span>
          
          <button
            onClick={() => resolveSignal(signal.id, 'WIN')}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>WIN</span>
          </button>

          <button
            onClick={() => resolveSignal(signal.id, 'LOSS')}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-800/60 transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            <span>LOSS</span>
          </button>

          <button
            onClick={() => resolveSignal(signal.id, 'DRAW')}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-400 border border-dark-700 transition-colors flex items-center gap-1"
          >
            <MinusCircle className="w-3 h-3" />
            <span>DRAW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
