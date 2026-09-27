// src/engine/models/trendModel.ts

import { IndicatorValues } from '../../types/indicators';
import { SignalDirection } from '../../types/signal';

export class TrendModel {
  public static readonly name = 'Trend Model';
  public static readonly code = 'MODEL_B_TREND';

  public static predict(
    ind: IndicatorValues,
    currentPrice: number
  ): { direction: SignalDirection; score: number; reason: string } {
    let score = 50;

    // EMA 9 vs EMA 21
    if (ind.ema9 > ind.ema21) {
      score += 20;
    } else {
      score -= 20;
    }

    // EMA 21 vs EMA 50
    if (ind.ema21 > ind.ema50) {
      score += 15;
    } else {
      score -= 15;
    }

    // Price relative to EMAs
    if (currentPrice > ind.ema9) {
      score += 15;
    } else if (currentPrice < ind.ema9) {
      score -= 15;
    }

    // ADX / DI direction
    if (ind.diPlus > ind.diMinus) {
      score += ind.adx14 > 22 ? 15 : 8;
    } else {
      score -= ind.adx14 > 22 ? 15 : 8;
    }

    score = Math.max(5, Math.min(95, Math.round(score)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'Trend structure flat or consolidating';
    if (score >= 54) {
      direction = 'CALL';
      reason = 'Bullish moving average alignment & directional trend';
    } else if (score <= 46) {
      direction = 'PUT';
      reason = 'Bearish moving average alignment & downward trend';
    }

    return { direction, score, reason };
  }
}
