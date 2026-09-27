// src/components/layout/DisclaimerBanner.tsx

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <footer className="mt-8 mb-4 px-4 select-none">
      <div className="max-w-7xl mx-auto p-3 rounded-xl bg-dark-900/80 border border-dark-800 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-300">Analytical Output Disclaimer:</strong> AI-generated signals are algorithmic analytical outputs based on technical indicator calculus, price action structure, and modular ensemble scoring. They do <span className="text-amber-300 font-semibold">NOT guarantee accuracy or profit</span>. OTC digital-option trading involves substantial financial risk.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quotex OTC Analytical Suite • Zero Hardcoded Guarantees</span>
        </div>
      </div>
    </footer>
  );
};
