// src/components/auth/LoginView.tsx

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Sparkles, AlertCircle, Cpu, Lock, CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, isLoading, deviceId } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-format key with dashes (XXXX-XXXX-XXXX-XXXX)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Auto-insert hyphens if user is typing raw characters
    const cleanChars = val.replace(/-/g, '');
    if (cleanChars.length <= 16 && !val.includes('-') && cleanChars.length > 4) {
      val = cleanChars.match(/.{1,4}/g)?.join('-') || cleanChars;
    }

    setKeyInput(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMessage('Please enter your license key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await login(keyInput);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to activate license key.');
    }
    setIsSubmitting(false);
  };

  const fillTestKey = (key: string) => {
    setKeyInput(key);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between items-center p-4 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Branding */}
      <div className="w-full max-w-md pt-8 text-center z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-900 border border-cyan-500/30 shadow-glow-cyan mb-4">
          <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
          CHINESE SIGNALS <span className="text-cyan-400">AI BOT</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Quotex OTC Quantitative Trading Terminal • Hardware Locked License
        </p>
      </div>

      {/* Main Activation Card */}
      <div className="w-full max-w-md z-10 my-auto">
        <div className="p-6 sm:p-8 rounded-3xl bg-dark-900/90 backdrop-blur-xl border border-dark-750 shadow-2xl relative">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                License Activation Gate
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono text-[10px] font-bold">
              v2.0 AUTH
            </span>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Enter License Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={keyInput}
                  onChange={handleInputChange}
                  disabled={isLoading || isSubmitting}
                  maxLength={24}
                  className="w-full bg-dark-950 border border-dark-700 hover:border-dark-600 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-3 text-white font-mono font-bold tracking-widest text-center text-sm placeholder:text-slate-600 focus:outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Activate CTA */}
            <button
              type="submit"
              disabled={isLoading || isSubmitting || !keyInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-black shadow-glow-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isSubmitting || isLoading ? 'animate-spin' : ''}`} />
              <span>{isSubmitting || isLoading ? 'VALIDATING HARDWARE BINDING...' : 'ACTIVATE ACCESS'}</span>
            </button>
          </form>

          {/* Quick Demo Test Keys Helper */}
          <div className="mt-6 pt-4 border-t border-dark-800/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Available Test Keys (Pre-seeded in DB)
            </div>
            <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => fillTestKey('CSAI-DEMO-7DAY-TEST')}
                className="w-full p-2 rounded-lg bg-dark-950 hover:bg-dark-850 border border-dark-800 hover:border-cyan-800/50 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors"
              >
                <span>CSAI-DEMO-7DAY-TEST</span>
                <span className="text-[10px] text-cyan-400 font-bold font-sans">7-Day Demo</span>
              </button>

              <button
                type="button"
                onClick={() => fillTestKey('CSAI-VIP1-30DY-TEST')}
                className="w-full p-2 rounded-lg bg-dark-950 hover:bg-dark-850 border border-dark-800 hover:border-cyan-800/50 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors"
              >
                <span>CSAI-VIP1-30DY-TEST</span>
                <span className="text-[10px] text-emerald-400 font-bold font-sans">30-Day VIP</span>
              </button>

              <button
                type="button"
                onClick={() => fillTestKey('CSAI-LIFE-PASS-TEST')}
                className="w-full p-2 rounded-lg bg-dark-950 hover:bg-dark-850 border border-dark-800 hover:border-cyan-800/50 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition-colors"
              >
                <span>CSAI-LIFE-PASS-TEST</span>
                <span className="text-[10px] text-purple-400 font-bold font-sans">Lifetime Access</span>
              </button>
            </div>
          </div>
        </div>

        {/* Device Binding Footer Note */}
        <div className="mt-4 text-center text-[11px] text-slate-500 font-mono">
          <div className="flex items-center justify-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Lock ID:</span>
            <span className="text-slate-300 font-bold truncate max-w-[200px]">{deviceId}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-600">
            Keys are bound to a single device upon activation. No passwords or emails required.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md pb-4 text-center text-[10px] text-slate-600 font-mono z-10">
        Quotex OTC Trading Matrix • 100% Serverless Protected • Encrypted JWT Cookie
      </div>
    </div>
  );
};
