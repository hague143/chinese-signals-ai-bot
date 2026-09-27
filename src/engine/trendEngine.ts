// src/engine/trendEngine.ts

import { IndicatorValues, TrendDirection } from '../types/indicators';

export class TrendEngine {
  /**
   * Determine Trend Direction using EMA 9/21/50 alignment, ADX strength, and DI+/DI-
   */
  public static evaluateTrend(ind: IndicatorValues, currentPrice: number): {
    trend: TrendDirection;
    trendScore: number; // 0 to 100 bullish bias
    reasons: string[];
  } {
    const reasons: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;
    let totalPoints = 0;

    // 1. EMA 9 vs EMA 21
    totalPoints += 25;
    if (ind.ema9 > ind.ema21) {
      bullishPoints += 25;
      reasons.push('EMA 9 is above EMA 21 (Bullish short-term alignment)');
    } else {
      bearishPoints += 25;
      reasons.push('EMA 9 is below EMA 21 (Bearish short-term alignment)');
    }

    // 2. EMA 21 vs EMA 50
    totalPoints += 25;
    if (ind.ema21 > ind.ema50) {
      bullishPoints += 25;
      reasons.push('EMA 21 is above EMA 50 (Bullish structural baseline)');
    } else {
      bearishPoints += 25;
      reasons.push('EMA 21 is below EMA 50 (Bearish structural baseline)');
    }

    // 3. Price position relative to EMA 9 & EMA 21
    totalPoints += 20;
    if (currentPrice > ind.ema9 && currentPrice > ind.ema21) {
      bullishPoints += 20;
      reasons.push('Price is trading above key moving averages');
    } else if (currentPrice < ind.ema9 && currentPrice < ind.ema21) {
      bearishPoints += 20;
      reasons.push('Price is trading below key moving averages');
    } else {
      bullishPoints += 10;
      bearishPoints += 10;
      reasons.push('Price oscillating between EMAs');
    }

    // 4. ADX trend strength & DI directional bias
    totalPoints += 30;
    const isStrongTrend = ind.adx14 > 25;
    if (ind.diPlus > ind.diMinus) {
      if (isStrongTrend) {
        bullishPoints += 30;
        reasons.push(`ADX ${Math.round(ind.adx14)} indicates strong bullish momentum`);
      } else {
        bullishPoints += 20;
        bearishPoints += 10;
        reasons.push('DI+ leads DI- in moderate trend environment');
      }
    } else {
      if (isStrongTrend) {
        bearishPoints += 30;
        reasons.push(`ADX ${Math.round(ind.adx14)} indicates strong bearish momentum`);
      } else {
        bearishPoints += 20;
        bullishPoints += 10;
        reasons.push('DI- leads DI+ in moderate trend environment');
      }
    }

    const trendScore = (bullishPoints / totalPoints) * 100;

    let trend: TrendDirection;
    if (trendScore >= 80 && ind.adx14 > 25) {
      trend = 'STRONG_UPTREND';
    } else if (trendScore >= 60) {
      trend = 'UPTREND';
    } else if (trendScore <= 20 && ind.adx14 > 25) {
      trend = 'STRONG_DOWNTREND';
    } else if (trendScore <= 40) {
      trend = 'DOWNTREND';
    } else {
      trend = 'SIDEWAYS';
    }

    return { trend, trendScore, reasons };
  }
}
