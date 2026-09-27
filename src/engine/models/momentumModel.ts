// src/engine/models/momentumModel.ts

import { IndicatorValues } from '../../types/indicators';
import { ExpiryDuration } from '../../types/market';
import { SignalDirection } from '../../types/signal';

export class MomentumModel {
  public static readonly name = 'Momentum Model';
  public static readonly code = 'MODEL_A_MOMENTUM';

  public static predict(
    ind: IndicatorValues,
    expiry: ExpiryDuration
  ): { direction: SignalDirection; score: number; reason: string } {
    let score = 50;

    // RSI
    if (ind.rsi14 > 52) {
      score += Math.min(25, (ind.rsi14 - 50) * 1.5);
    } else if (ind.rsi14 < 48) {
      score -= Math.min(25, (50 - ind.rsi14) * 1.5);
    }

    // MACD Histogram
    if (ind.macdHistogram > 0) {
      score += ind.macdCrossBullish ? 20 : 12;
    } else if (ind.macdHistogram < 0) {
      score -= ind.macdCrossBearish ? 20 : 12;
    }

    // Microstructure momentum
    if (expiry === '5s' || expiry === '10s' || expiry === '15s') {
      if (ind.momentum1 > 0) score += 15;
      else if (ind.momentum1 < 0) score -= 15;

      if (ind.priceAcceleration > 0) score += 10;
      else if (ind.priceAcceleration < 0) score -= 10;
    } else {
      if (ind.momentum3 > 0) score += 15;
      else if (ind.momentum3 < 0) score -= 15;

      if (ind.momentum5 > 0) score += 10;
      else if (ind.momentum5 < 0) score -= 10;
    }

    // Stochastics
    if (ind.stochK > ind.stochD) score += 10;
    else if (ind.stochK < ind.stochD) score -= 10;

    score = Math.max(5, Math.min(95, Math.round(score)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'Momentum oscillators showing balanced conditions';

    if (score >= 54) {
      direction = 'CALL';
      reason = 'Positive RSI trajectory and upward momentum flow';
    } else if (score <= 46) {
      direction = 'PUT';
      reason = 'Negative RSI trajectory and downward momentum pressure';
    }

    return { direction, score, reason };
  }
}
