// src/engine/models/priceActionModel.ts

import { IndicatorValues } from '../../types/indicators';
import { SignalDirection } from '../../types/signal';

export class PriceActionModel {
  public static readonly name = 'Price-Action Model';
  public static readonly code = 'MODEL_D_PRICE_ACTION';

  public static predict(
    ind: IndicatorValues
  ): { direction: SignalDirection; score: number; reason: string } {
    let score = 50;

    if (ind.bullishEngulfing) score += 25;
    else if (ind.bearishEngulfing) score -= 25;

    if (ind.hammerPinbar) score += 20;
    else if (ind.shootingStar) score -= 20;

    if (ind.nearSupportRejection) score += 20;
    else if (ind.nearResistanceRejection) score -= 20;

    if (ind.breakoutUp) score += 20;
    else if (ind.breakoutDown) score -= 20;

    if (ind.isBullishCandle) score += 8;
    else score -= 8;

    if (ind.consecutiveBullish >= 2) score += 10;
    else if (ind.consecutiveBearish >= 2) score -= 10;

    score = Math.max(5, Math.min(95, Math.round(score)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'Price action structures neutral';

    if (score >= 54) {
      direction = 'CALL';
      reason = 'Bullish candle geometry with buying wick rejection & support validation';
    } else if (score <= 46) {
      direction = 'PUT';
      reason = 'Bearish candle geometry with selling wick rejection & resistance validation';
    }

    return { direction, score, reason };
  }
}
