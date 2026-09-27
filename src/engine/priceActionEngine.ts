// src/engine/priceActionEngine.ts

import { IndicatorValues } from '../types/indicators';

export class PriceActionEngine {
  /**
   * Evaluate price action structure, rejections, engulfing, pinbars, and swing levels
   */
  public static evaluatePriceAction(ind: IndicatorValues): {
    priceActionScore: number; // 0 to 100 bullish bias
    reasons: string[];
  } {
    const reasons: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;
    let totalPoints = 0;

    // 1. Candlestick patterns
    totalPoints += 30;
    if (ind.bullishEngulfing) {
      bullishPoints += 30;
      reasons.push('Bullish Engulfing pattern confirmed');
    } else if (ind.bearishEngulfing) {
      bearishPoints += 30;
      reasons.push('Bearish Engulfing pattern confirmed');
    } else if (ind.hammerPinbar) {
      bullishPoints += 25;
      reasons.push('Bullish Hammer / Pin Bar rejection candle detected');
    } else if (ind.shootingStar) {
      bearishPoints += 25;
      reasons.push('Bearish Shooting Star / Rejection wick detected');
    } else {
      bullishPoints += 15;
      bearishPoints += 15;
    }

    // 2. Support & Resistance Interaction
    totalPoints += 35;
    if (ind.nearSupportRejection) {
      bullishPoints += 35;
      reasons.push('Clean bounce/rejection from dynamic support level');
    } else if (ind.nearResistanceRejection) {
      bearishPoints += 35;
      reasons.push('Clean rejection from dynamic resistance ceiling');
    } else if (ind.breakoutUp) {
      bullishPoints += 30;
      reasons.push('Upside breakout through resistance structure');
    } else if (ind.breakoutDown) {
      bearishPoints += 30;
      reasons.push('Downside breakdown through support structure');
    } else if (ind.falseBreakout) {
      if (ind.isBullishCandle) {
        bullishPoints += 25;
        reasons.push('Bear trap detected: false breakdown recovered bullishly');
      } else {
        bearishPoints += 25;
        reasons.push('Bull trap detected: false breakout rejected bearishly');
      }
    } else {
      bullishPoints += 17.5;
      bearishPoints += 17.5;
    }

    // 3. Consecutive candle pressure and wick dynamics
    totalPoints += 35;
    if (ind.consecutiveBullish >= 2 && ind.lowerWick > ind.upperWick) {
      bullishPoints += 35;
      reasons.push(`${ind.consecutiveBullish} consecutive green bars with lower wick buying absorption`);
    } else if (ind.consecutiveBearish >= 2 && ind.upperWick > ind.lowerWick) {
      bearishPoints += 35;
      reasons.push(`${ind.consecutiveBearish} consecutive red bars with upper wick selling pressure`);
    } else if (ind.isBullishCandle) {
      bullishPoints += 20;
      bearishPoints += 15;
    } else {
      bearishPoints += 20;
      bullishPoints += 15;
    }

    const priceActionScore = (bullishPoints / totalPoints) * 100;
    return { priceActionScore, reasons };
  }
}
