// src/engine/volatilityEngine.ts

import { IndicatorValues, VolatilityRegime, MarketRegimeType } from '../types/indicators';

export class VolatilityEngine {
  /**
   * Classify Volatility Regime and broader Market Regime
   */
  public static evaluateVolatilityAndRegime(
    ind: IndicatorValues,
    trendScore: number
  ): {
    volatilityRegime: VolatilityRegime;
    marketRegime: MarketRegimeType;
    volatilityScore: number;
    isExtremeOrDangerous: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    const atrPct = ind.atrPct;
    const bbWidth = ind.bbWidth * 100;

    let volatilityRegime: VolatilityRegime = 'NORMAL_VOLATILITY';
    let isExtremeOrDangerous = false;
    let volatilityScore = 85;

    // Calibrated thresholds for OTC forex & crypto pairs
    if (atrPct > 1.5 || bbWidth > 3.0) {
      volatilityRegime = 'EXTREME_VOLATILITY';
      isExtremeOrDangerous = true;
      volatilityScore = 40;
      reasons.push('High sudden volatility expansion detected — elevated slippage risk');
    } else if (atrPct > 0.8 || bbWidth > 1.5) {
      volatilityRegime = 'HIGH_VOLATILITY';
      volatilityScore = 70;
      reasons.push('Active volatility expansion in progress');
    } else if (atrPct < 0.005 || bbWidth < 0.01) {
      volatilityRegime = 'LOW_VOLATILITY';
      volatilityScore = 60;
      reasons.push('Tight range compression — breakout potential building');
    } else {
      volatilityRegime = 'NORMAL_VOLATILITY';
      volatilityScore = 90;
      reasons.push('Normal volatility regime favorable for short expiry execution');
    }

    // Market Regime determination
    let marketRegime: MarketRegimeType = 'UNCERTAIN';

    if (isExtremeOrDangerous) {
      marketRegime = 'HIGH_VOLATILITY';
    } else if (ind.breakoutUp || ind.breakoutDown) {
      marketRegime = 'BREAKOUT';
      reasons.push('Breakout beyond recent support/resistance boundaries');
    } else if (trendScore >= 60 || trendScore <= 40) {
      marketRegime = 'TRENDING';
      reasons.push('Directional trend structure intact');
    } else if (volatilityRegime === 'LOW_VOLATILITY') {
      marketRegime = 'LOW_VOLATILITY';
      reasons.push('Low volatility squeeze/compression phase');
    } else {
      marketRegime = 'RANGING';
      reasons.push('Sideways ranging market oscillating between key levels');
    }

    return {
      volatilityRegime,
      marketRegime,
      volatilityScore,
      isExtremeOrDangerous,
      reasons,
    };
  }
}
