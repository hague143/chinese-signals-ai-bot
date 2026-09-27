// src/engine/backtestEngine.ts

import { Candle, ExpiryDuration, EXPIRY_SECONDS_MAP } from '../types/market';
import { UserSettings } from '../types/settings';
import { BacktestConfig, BacktestResult, BacktestTrade } from '../types/backtest';
import { SignalPipeline } from './signalPipeline';

export class BacktestEngine {
  /**
   * Run a strictly chronological, non-lookahead walk-forward simulation
   */
  public static runBacktest(
    candles: Candle[],
    config: BacktestConfig,
    settings: UserSettings
  ): BacktestResult {
    const minHistory = 35; // Minimum history needed for EMA50 / RSI14 / MACD warmup
    const totalCandles = candles.length;

    if (totalCandles < minHistory + 10) {
      throw new Error('Insufficient historical bars for walk-forward backtest (minimum 45 bars required).');
    }

    const trades: BacktestTrade[] = [];
    let cumulativePnl = 1000; // start with $1,000 base
    const equityCurve: { time: string; equity: number }[] = [
      { time: new Date(candles[minHistory].time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), equity: cumulativePnl }
    ];

    let filteredWaitCount = 0;
    const expiryStepSec = EXPIRY_SECONDS_MAP[config.expiry];

    // Walk forward bar by bar
    // Determine bar step size: assume candles are ~5s or 1m interval
    const candleDurationSec = totalCandles > 1 ? candles[1].time - candles[0].time : 5;
    const barsPerExpiry = Math.max(1, Math.round(expiryStepSec / Math.max(1, candleDurationSec)));

    for (let i = minHistory; i < totalCandles - barsPerExpiry; i += Math.max(1, Math.floor(barsPerExpiry / 2))) {
      // Strictly slice historical data UP TO index i (Zero lookahead)
      const historicalSlice = candles.slice(0, i + 1);

      // Generate signal at point in time
      const signal = SignalPipeline.generateSignal({
        symbol: config.symbol,
        candles: historicalSlice,
        expiry: config.expiry,
        settings: {
          ...settings,
          minConfidenceThreshold: config.minConfidence,
          requireMultiTimeframeConfirmation: config.requireMtf,
        },
      });

      if (signal.direction === 'WAIT') {
        filteredWaitCount++;
        continue;
      }

      // Look at future outcome at index i + barsPerExpiry
      const futureIndex = i + barsPerExpiry;
      const entryPrice = signal.entryPrice;
      const exitPrice = candles[futureIndex].close;
      const entryTime = candles[i].time * 1000;

      let outcome: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
      let pnl = 0;

      // Assume 85% payout
      const payoutPct = 0.85;
      const tradeStake = 10; // $10 standard stake per trade

      if (signal.direction === 'CALL') {
        if (exitPrice > entryPrice) {
          outcome = 'WIN';
          pnl = tradeStake * payoutPct;
        } else if (exitPrice < entryPrice) {
          outcome = 'LOSS';
          pnl = -tradeStake;
        } else {
          outcome = 'DRAW';
          pnl = 0;
        }
      } else if (signal.direction === 'PUT') {
        if (exitPrice < entryPrice) {
          outcome = 'WIN';
          pnl = tradeStake * payoutPct;
        } else if (exitPrice > entryPrice) {
          outcome = 'LOSS';
          pnl = -tradeStake;
        } else {
          outcome = 'DRAW';
          pnl = 0;
        }
      }

      cumulativePnl += pnl;

      trades.push({
        id: `bt-trade-${i}`,
        time: entryTime,
        timeFormatted: new Date(entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        symbol: config.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entryPrice,
        exitPrice,
        expirySeconds: expiryStepSec,
        outcome,
        pnl: Math.round(pnl * 100) / 100,
        cumulativePnl: Math.round(cumulativePnl * 100) / 100,
        reasons: signal.analysisReasons,
        marketRegime: signal.marketRegime,
      });

      equityCurve.push({
        time: new Date(entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        equity: Math.round(cumulativePnl * 100) / 100,
      });
    }

    // Calculate aggregated statistics
    const totalSignals = trades.length;
    const wins = trades.filter(t => t.outcome === 'WIN').length;
    const losses = trades.filter(t => t.outcome === 'LOSS').length;
    const draws = trades.filter(t => t.outcome === 'DRAW').length;
    const winRate = totalSignals > 0 ? (wins / (wins + losses || 1)) * 100 : 0;

    const totalProfit = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99 : 0;

    // Drawdown and streaks
    let maxDrawdownPct = 0;
    let peakEquity = 1000;
    let maxWinsStreak = 0;
    let maxLossStreak = 0;
    let currentWinsStreak = 0;
    let currentLossStreak = 0;
    let confidenceSum = 0;

    trades.forEach(t => {
      confidenceSum += t.confidence;
      if (t.cumulativePnl > peakEquity) {
        peakEquity = t.cumulativePnl;
      }
      const dd = ((peakEquity - t.cumulativePnl) / peakEquity) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;

      if (t.outcome === 'WIN') {
        currentWinsStreak++;
        currentLossStreak = 0;
        if (currentWinsStreak > maxWinsStreak) maxWinsStreak = currentWinsStreak;
      } else if (t.outcome === 'LOSS') {
        currentLossStreak++;
        currentWinsStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    });

    const avgConfidence = totalSignals > 0 ? confidenceSum / totalSignals : 0;

    // Breakdown by Confidence Buckets (75-79%, 80-84%, 85-89%, 90-94%, 95%+)
    const bucketsDef = [
      { min: 70, max: 74.9, range: '70%–74%' },
      { min: 75, max: 79.9, range: '75%–79%' },
      { min: 80, max: 84.9, range: '80%–84%' },
      { min: 85, max: 89.9, range: '85%–89%' },
      { min: 90, max: 100, range: '90%+' },
    ];

    const confidenceBuckets = bucketsDef.map(b => {
      const bucketTrades = trades.filter(t => t.confidence >= b.min && t.confidence <= b.max);
      const bWins = bucketTrades.filter(t => t.outcome === 'WIN').length;
      const bLosses = bucketTrades.filter(t => t.outcome === 'LOSS').length;
      const bTotal = bucketTrades.length;
      const bRate = bTotal > 0 ? (bWins / (bWins + bLosses || 1)) * 100 : 0;
      return {
        range: b.range,
        total: bTotal,
        wins: bWins,
        losses: bLosses,
        winRate: Math.round(bRate * 10) / 10,
      };
    });

    // Breakdown by Market Regime
    const regimes = ['TRENDING', 'RANGING', 'BREAKOUT', 'LOW_VOLATILITY', 'UNCERTAIN'];
    const regimeBreakdown = regimes.map(regime => {
      const regTrades = trades.filter(t => t.marketRegime === regime);
      const rWins = regTrades.filter(t => t.outcome === 'WIN').length;
      const rLosses = regTrades.filter(t => t.outcome === 'LOSS').length;
      const rTotal = regTrades.length;
      const rRate = rTotal > 0 ? (rWins / (rWins + rLosses || 1)) * 100 : 0;
      return {
        regime,
        total: rTotal,
        wins: rWins,
        losses: rLosses,
        winRate: Math.round(rRate * 10) / 10,
      };
    });

    return {
      config,
      totalSignals,
      callSignals: trades.filter(t => t.direction === 'CALL').length,
      putSignals: trades.filter(t => t.direction === 'PUT').length,
      filteredWaitCount,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
      maxConsecutiveWins: maxWinsStreak,
      maxConsecutiveLosses: maxLossStreak,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      confidenceBuckets,
      regimeBreakdown,
      trades,
      equityCurve,
    };
  }
}
