// src/engine/momentumEngine.ts

import { IndicatorValues } from '../types/indicators';

export class MomentumEngine {
  /**
   * Evaluate short-term momentum, tick acceleration, RSI trajectory, MACD impulse
   */
  public static evaluateMomentum(ind: IndicatorValues): {
    momentumState: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
    momentumScore: number; // 0 to 100 bullish bias
    reasons: string[];
  } {
    const reasons: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;
    let totalPoints = 0;

    // 1. RSI value and velocity
    totalPoints += 25;
    if (ind.rsi14 > 55 && ind.rsi14 > ind.rsiPrev) {
      bullishPoints += 25;
      reasons.push(`RSI (${Math.round(ind.rsi14)}) rising in bullish zone`);
    } else if (ind.rsi14 < 45 && ind.rsi14 < ind.rsiPrev) {
      bearishPoints += 25;
      reasons.push(`RSI (${Math.round(ind.rsi14)}) falling in bearish zone`);
    } else if (ind.rsi14 >= 50) {
      bullishPoints += 15;
      bearishPoints += 10;
    } else {
      bullishPoints += 10;
      bearishPoints += 15;
    }

    // 2. MACD Histogram Impulse
    totalPoints += 25;
    if (ind.macdHistogram > 0 && ind.macdCrossBullish) {
      bullishPoints += 25;
      reasons.push('MACD positive histogram with bullish expansion');
    } else if (ind.macdHistogram > 0) {
      bullishPoints += 20;
      bearishPoints += 5;
      reasons.push('MACD histogram remains positive');
    } else if (ind.macdHistogram < 0 && ind.macdCrossBearish) {
      bearishPoints += 25;
      reasons.push('MACD negative histogram with bearish expansion');
    } else if (ind.macdHistogram < 0) {
      bearishPoints += 20;
      bullishPoints += 5;
      reasons.push('MACD histogram remains negative');
    } else {
      bullishPoints += 12;
      bearishPoints += 12;
    }

    // 3. Multi-Candle Momentum (1-candle, 3-candle, 5-candle)
    totalPoints += 30;
    if (ind.momentum1 > 0 && ind.momentum3 > 0 && ind.momentum5 > 0) {
      bullishPoints += 30;
      reasons.push('Consistent 1, 3, and 5-candle directional upward flow');
    } else if (ind.momentum1 < 0 && ind.momentum3 < 0 && ind.momentum5 < 0) {
      bearishPoints += 30;
      reasons.push('Consistent 1, 3, and 5-candle directional downward flow');
    } else if (ind.momentum1 > 0 && ind.priceAcceleration > 0) {
      bullishPoints += 20;
      bearishPoints += 10;
      reasons.push('Short-term positive price acceleration');
    } else if (ind.momentum1 < 0 && ind.priceAcceleration < 0) {
      bearishPoints += 20;
      bullishPoints += 10;
      reasons.push('Short-term negative price acceleration');
    } else {
      bullishPoints += 15;
      bearishPoints += 15;
    }

    // 4. Stochastics & Williams %R
    totalPoints += 20;
    if (ind.stochK > ind.stochD && ind.stochK < 80) {
      bullishPoints += 20;
      reasons.push('Stochastic %K crossed above %D with room to run');
    } else if (ind.stochK < ind.stochD && ind.stochK > 20) {
      bearishPoints += 20;
      reasons.push('Stochastic %K crossed below %D with downward pressure');
    } else {
      bullishPoints += 10;
      bearishPoints += 10;
    }

    const momentumScore = (bullishPoints / totalPoints) * 100;

    let momentumState: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
    if (momentumScore >= 80) {
      momentumState = 'Strong Bullish';
    } else if (momentumScore >= 60) {
      momentumState = 'Bullish';
    } else if (momentumScore <= 20) {
      momentumState = 'Strong Bearish';
    } else if (momentumScore <= 40) {
      momentumState = 'Bearish';
    } else {
      momentumState = 'Neutral';
    }

    return { momentumState, momentumScore, reasons };
  }
}
