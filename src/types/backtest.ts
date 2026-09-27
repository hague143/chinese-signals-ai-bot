// src/types/backtest.ts

import { ExpiryDuration } from './market';
import { SignalDirection, SignalOutcome } from './signal';

export interface BacktestConfig {
  symbol: string;
  expiry: ExpiryDuration;
  candlesCount: number; // e.g. 500 or 1000 candles
  minConfidence: number; // e.g. 75
  requireMtf: boolean;
  takeProfitWinRate?: number;
}

export interface BacktestTrade {
  id: string;
  time: number;
  timeFormatted: string;
  symbol: string;
  direction: SignalDirection;
  confidence: number;
  entryPrice: number;
  exitPrice: number;
  expirySeconds: number;
  outcome: SignalOutcome;
  pnl: number; // in simulated units / % (e.g. +88 or -100)
  cumulativePnl: number;
  reasons: string[];
  marketRegime: string;
}

export interface BacktestResult {
  config: BacktestConfig;
  totalSignals: number;
  callSignals: number;
  putSignals: number;
  filteredWaitCount: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage
  profitFactor: number;
  maxDrawdownPct: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgConfidence: number;
  
  // Breakdown by confidence ranges
  confidenceBuckets: {
    range: string;
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];

  // Breakdown by market regimes
  regimeBreakdown: {
    regime: string;
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];

  trades: BacktestTrade[];
  equityCurve: { time: string; equity: number }[];
}
