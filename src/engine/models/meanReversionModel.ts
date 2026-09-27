// src/engine/models/meanReversionModel.ts

import { IndicatorValues } from '../../types/indicators';
import { SignalDirection } from '../../types/signal';

export class MeanReversionModel {
  public static readonly name = 'Mean-Reversion Model';
  public static readonly code = 'MODEL_C_MEAN_REVERSION';

  public static predict(
    ind: IndicatorValues,
    currentPrice: number
  ): { direction: SignalDirection; score: number; reason: string } {
    let score = 50;

    // RSI extreme bounce
    if (ind.rsi14 < 35) {
      score += 25; // Oversold -> CALL
    } else if (ind.rsi14 > 65) {
      score -= 25; // Overbought -> PUT
    } else if (ind.rsi14 < 50) {
      score += 5;
    } else {
      score -= 5;
    }

    // Bollinger Band position
    if (currentPrice <= ind.bbLower || ind.bbPctB < 0.15) {
      score += 25;
    } else if (currentPrice >= ind.bbUpper || ind.bbPctB > 0.85) {
      score -= 25;
    } else if (ind.bbPctB < 0.5) {
      score += 5;
    } else {
      score -= 5;
    }

    // Support / Resistance interaction
    if (ind.nearSupportRejection) {
      score += 20;
    } else if (ind.nearResistanceRejection) {
      score -= 20;
    }

    // Williams %R
    if (ind.williamsR < -80) score += 15;
    else if (ind.williamsR > -20) score -= 15;

    score = Math.max(5, Math.min(95, Math.round(score)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'Price oscillating within normal band distribution';

    if (score >= 54) {
      direction = 'CALL';
      reason = 'Statistical oversold extreme: Bollinger lower band & support bounce';
    } else if (score <= 46) {
      direction = 'PUT';
      reason = 'Statistical overbought extreme: Bollinger upper band & resistance rejection';
    }

    return { direction, score, reason };
  }
}
