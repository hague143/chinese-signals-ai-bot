// src/engine/models/regimeModel.ts

import { IndicatorValues, VolatilityRegime, MarketRegimeType } from '../../types/indicators';
import { SignalDirection } from '../../types/signal';

export class RegimeModel {
  public static readonly name = 'Volatility & Regime Model';
  public static readonly code = 'MODEL_E_REGIME';

  public static predict(
    ind: IndicatorValues,
    marketRegime: MarketRegimeType,
    volatilityRegime: VolatilityRegime
  ): { direction: SignalDirection; score: number; reason: string } {
    let score = 50;

    if (volatilityRegime === 'EXTREME_VOLATILITY') {
      return {
        direction: 'WAIT',
        score: 50,
        reason: 'Extreme volatility expansion engaged',
      };
    }

    if (marketRegime === 'BREAKOUT') {
      if (ind.breakoutUp || ind.isBullishCandle) score = 75;
      else score = 25;
    } else if (marketRegime === 'TRENDING') {
      if (ind.ema9 > ind.ema21) score = 70;
      else score = 30;
    } else if (marketRegime === 'RANGING') {
      if (ind.rsi14 < 48) score = 60;
      else if (ind.rsi14 > 52) score = 40;
    } else {
      if (ind.ema9 > ind.ema21) score = 58;
      else score = 42;
    }

    score = Math.max(5, Math.min(95, Math.round(score)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'Regime filter supports disciplined execution';

    if (score >= 54) {
      direction = 'CALL';
      reason = 'Regime alignment: active trend expansion favoring upside';
    } else if (score <= 46) {
      direction = 'PUT';
      reason = 'Regime alignment: active trend expansion favoring downside';
    }

    return { direction, score, reason };
  }
}
