// src/context/SignalContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MasterSignalOutput, SignalOutcome, SignalDirection } from '../types/signal';
import { ExpiryDuration, OTCPair } from '../types/market';
import { SignalPipeline } from '../engine/signalPipeline';
import { StorageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { TelegramService } from '../services/telegramService';
import { NotificationService } from '../services/notificationService';
import { useMarket } from './MarketContext';
import { useSettings } from './SettingsContext';
import confetti from 'canvas-confetti';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface SignalContextType {
  currentSignal: MasterSignalOutput | null;
  activeSignal: MasterSignalOutput | null;
  signalHistory: MasterSignalOutput[];
  isAnalyzing: boolean;
  analysisSteps: AnalysisStep[];
  countdownRemaining: number;
  isCountdownActive: boolean;
  isExpired: boolean;
  generateSignal: (pair?: OTCPair, expiry?: ExpiryDuration, precomputedSignal?: MasterSignalOutput) => Promise<MasterSignalOutput | null>;
  resolveSignal: (signalId: string, outcome: SignalOutcome, exitPrice?: number) => void;
  deleteSignal: (signalId: string) => void;
  clearHistory: () => void;
  isScanning: boolean;
  scanResults: MasterSignalOutput[];
  scanAllMarkets: () => Promise<MasterSignalOutput[]>;
}

const SignalContext = createContext<SignalContextType | null>(null);

const DEFAULT_STEPS: AnalysisStep[] = [
  { id: 'data', label: 'DATA CHECK', status: 'pending' },
  { id: 'tech', label: 'TECHNICAL ANALYSIS', status: 'pending' },
  { id: 'trend', label: 'TREND ANALYSIS', status: 'pending' },
  { id: 'momentum', label: 'MOMENTUM ANALYSIS', status: 'pending' },
  { id: 'ai', label: 'AI MODEL ENSEMBLE', status: 'pending' },
  { id: 'regime', label: 'MARKET REGIME & QUALITY', status: 'pending' },
  { id: 'final', label: 'FINAL SIGNAL', status: 'pending' },
];

export const SignalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedPair, selectedExpiry, currentPrice, provider } = useMarket();
  const { settings, pairs } = useSettings();

  const [signalHistory, setSignalHistory] = useState<MasterSignalOutput[]>(() => StorageService.getSignals());
  const [currentSignal, setCurrentSignal] = useState<MasterSignalOutput | null>(() => signalHistory[0] || null);
  const [activeSignal, setActiveSignal] = useState<MasterSignalOutput | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(DEFAULT_STEPS);

  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<MasterSignalOutput[]>([]);

  // Sound triggers based on signal
  const triggerSignalAlert = useCallback((sig: MasterSignalOutput) => {
    if (sig.direction === 'CALL') {
      audioService.playCallAlert();
    } else if (sig.direction === 'PUT') {
      audioService.playPutAlert();
    } else {
      audioService.playWaitAlert();
    }

    if (settings.browserNotificationsEnabled) {
      NotificationService.showSignalNotification(sig);
    }

    if (settings.telegram.enabled && settings.telegram.sendOnSignal && sig.confidence >= settings.telegram.minConfidenceToSend) {
      TelegramService.sendSignalAlert(sig, settings.telegram.botToken, settings.telegram.chatId);
    }
  }, [settings]);

  // Generate Signal function with realistic fast sequence
  const generateSignal = useCallback(async (
    targetPair?: OTCPair,
    targetExpiry?: ExpiryDuration,
    precomputedSignal?: MasterSignalOutput
  ): Promise<MasterSignalOutput | null> => {
    const pairToUse = targetPair || selectedPair;
    const expiryToUse = targetExpiry || selectedExpiry;

    setIsAnalyzing(true);
    setIsExpired(false);

    // Reset steps
    const steps: AnalysisStep[] = DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' }));
    setAnalysisSteps(steps);

    try {
      // Step 1: Data Check
      steps[0].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 90));
      steps[0].status = 'completed';

      // Step 2: Tech analysis
      steps[1].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 90));
      steps[1].status = 'completed';

      // Step 3: Trend analysis
      steps[2].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 80));
      steps[2].status = 'completed';

      // Step 4: Momentum
      steps[3].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 80));
      steps[3].status = 'completed';

      // Step 5: AI Model Ensemble
      steps[4].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 90));
      steps[4].status = 'completed';

      // Step 6: Regime & Quality
      steps[5].status = 'in-progress';
      setAnalysisSteps([...steps]);
      await new Promise(r => setTimeout(r, 70));
      steps[5].status = 'completed';

      // Step 7: Final Signal
      steps[6].status = 'in-progress';
      setAnalysisSteps([...steps]);

      let sig: MasterSignalOutput;

      if (precomputedSignal && precomputedSignal.symbol === pairToUse.symbol) {
        // Reuse precomputed consistent signal if provided from scanner
        sig = {
          ...precomputedSignal,
          id: `SIG-${pairToUse.symbol.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`,
          timestamp: Date.now(),
          expiresAt: Date.now() + precomputedSignal.expirySeconds * 1000,
        };
      } else {
        // Fetch synchronized 1m, 5m, 15m candles specifically for this pair
        const [c1m, c5m, c15m] = await Promise.all([
          provider.getCandles(pairToUse.symbol, '1m', 60),
          provider.getCandles(pairToUse.symbol, '5m', 30),
          provider.getCandles(pairToUse.symbol, '15m', 20),
        ]);

        sig = SignalPipeline.generateSignal({
          symbol: pairToUse.symbol,
          candles: c1m,
          higherTfCandles5m: c5m,
          higherTfCandles15m: c15m,
          expiry: expiryToUse,
          settings,
          lastActiveSignal: activeSignal,
        });
      }

      steps[6].status = 'completed';
      setAnalysisSteps([...steps]);

      setCurrentSignal(sig);
      setActiveSignal(sig);
      setCountdownRemaining(sig.expirySeconds);
      setIsCountdownActive(true);

      // Save to history
      StorageService.addSignal(sig);
      setSignalHistory(prev => [sig, ...prev]);

      // Sound and notifications
      triggerSignalAlert(sig);

      return sig;
    } catch (err) {
      console.error('Signal generation failed', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPair, selectedExpiry, provider, settings, activeSignal, triggerSignalAlert]);

  // Live countdown timer loop
  useEffect(() => {
    if (!isCountdownActive || !activeSignal) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const leftMs = activeSignal.expiresAt - now;
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000));

      setCountdownRemaining(leftSec);

      if (leftSec <= 0) {
        clearInterval(timer);
        setIsCountdownActive(false);
        setIsExpired(true);
        audioService.playExpireBeep();

        // Auto-resolve outcome if enabled
        if (settings.autoResolveSignals && activeSignal.direction !== 'WAIT') {
          const entry = activeSignal.entryPrice;
          const exit = currentPrice;
          let outcome: SignalOutcome = 'DRAW';

          if (activeSignal.direction === 'CALL') {
            outcome = exit > entry ? 'WIN' : exit < entry ? 'LOSS' : 'DRAW';
          } else if (activeSignal.direction === 'PUT') {
            outcome = exit < entry ? 'WIN' : exit > entry ? 'LOSS' : 'DRAW';
          }

          resolveSignal(activeSignal.id, outcome, exit);
        }
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isCountdownActive, activeSignal, currentPrice, settings.autoResolveSignals]);

  // Resolve outcome manually or automatically
  const resolveSignal = useCallback((signalId: string, outcome: SignalOutcome, exitPrice?: number) => {
    const exitP = exitPrice !== undefined ? exitPrice : currentPrice;
    
    StorageService.updateSignal(signalId, {
      result: outcome,
      exitPrice: exitP,
    });

    setSignalHistory(prev =>
      prev.map(s => (s.id === signalId ? { ...s, result: outcome, exitPrice: exitP } : s))
    );

    if (activeSignal && activeSignal.id === signalId) {
      setActiveSignal(prev => prev ? { ...prev, result: outcome, exitPrice: exitP } : null);
    }
    if (currentSignal && currentSignal.id === signalId) {
      setCurrentSignal(prev => prev ? { ...prev, result: outcome, exitPrice: exitP } : null);
    }

    if (outcome === 'WIN') {
      audioService.playWinFanfare();
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00e676', '#00f2fe', '#ffd54f'],
        });
      } catch {
        // confetti fallback
      }
    } else if (outcome === 'LOSS') {
      audioService.playLossSound();
    }
  }, [currentPrice, activeSignal, currentSignal]);

  const deleteSignal = useCallback((signalId: string) => {
    const updated = signalHistory.filter(s => s.id !== signalId);
    setSignalHistory(updated);
    StorageService.saveSignals(updated);
    if (activeSignal?.id === signalId) setActiveSignal(null);
    if (currentSignal?.id === signalId) setCurrentSignal(null);
  }, [signalHistory, activeSignal, currentSignal]);

  const clearHistory = useCallback(() => {
    setSignalHistory([]);
    StorageService.saveSignals([]);
  }, []);

  // Bulk Scanner for all active OTC markets
  const scanAllMarkets = useCallback(async (): Promise<MasterSignalOutput[]> => {
    setIsScanning(true);
    const activePairs = pairs.filter((p: OTCPair) => p.isActive);
    const results: MasterSignalOutput[] = [];

    try {
      for (const pair of activePairs) {
        try {
          const [c1m, c5m, c15m] = await Promise.all([
            provider.getCandles(pair.symbol, '1m', 60),
            provider.getCandles(pair.symbol, '5m', 30),
            provider.getCandles(pair.symbol, '15m', 20),
          ]);

          if (c1m && c1m.length >= 15) {
            const sig = SignalPipeline.generateSignal({
              symbol: pair.symbol,
              candles: c1m,
              higherTfCandles5m: c5m,
              higherTfCandles15m: c15m,
              expiry: selectedExpiry,
              settings,
            });
            results.push(sig);
          }
        } catch {
          // ignore individual pair scan failure
        }
      }

      // Sort by confidence descending
      results.sort((a, b) => b.confidence - a.confidence);
      setScanResults(results);
      return results;
    } finally {
      setIsScanning(false);
    }
  }, [pairs, provider, selectedExpiry, settings]);

  return (
    <SignalContext.Provider
      value={{
        currentSignal,
        activeSignal,
        signalHistory,
        isAnalyzing,
        analysisSteps,
        countdownRemaining,
        isCountdownActive,
        isExpired,
        generateSignal,
        resolveSignal,
        deleteSignal,
        clearHistory,
        isScanning,
        scanResults,
        scanAllMarkets,
      }}
    >
      {children}
    </SignalContext.Provider>
  );
};

export const useSignals = () => {
  const context = useContext(SignalContext);
  if (!context) {
    throw new Error('useSignals must be used within a SignalProvider');
  }
  return context;
};
