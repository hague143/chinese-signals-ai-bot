// src/types/indicators.ts

export type TrendDirection = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND';

export type VolatilityRegime = 'LOW_VOLATILITY' | 'NORMAL_VOLATILITY' | 'HIGH_VOLATILITY' | 'EXTREME_VOLATILITY';

export type MarketRegimeType = 'TRENDING' | 'RANGING' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY' | 'BREAKOUT' | 'UNCERTAIN';

export interface IndicatorValues {
  // Moving averages
  ema9: number;
  ema21: number;
  ema50: number;
  sma20: number;
  distanceFromEma9Pct: number;
  distanceFromEma21Pct: number;

  // Oscillators
  rsi14: number;
  rsiPrev: number;
  stochK: number;
  stochD: number;
  stochRsiK: number;
  stochRsiD: number;
  cci: number;
  williamsR: number;

  // MACD
  macdLine: number;
  signalLine: number;
  macdHistogram: number;
  macdCrossBullish: boolean;
  macdCrossBearish: boolean;

  // Bollinger Bands
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  bbPctB: number; // position inside BB (0=lower, 0.5=mid, 1.0=upper)

  // Volatility & Trend Strength
  atr14: number;
  atrPct: number;
  adx14: number;
  diPlus: number;
  diMinus: number;

  // Momentum & Microstructure
  momentum1: number; // 1-candle return %
  momentum3: number; // 3-candle return %
  momentum5: number; // 5-candle return %
  roc: number;
  priceAcceleration: number;
  directionalConsistency: number; // 0 to 1 score of consistent candle directions
  vwap?: number;

  // Support & Resistance
  supportLevel: number;
  resistanceLevel: number;
  distToSupportPct: number;
  distToResistancePct: number;
  nearSupportRejection: boolean;
  nearResistanceRejection: boolean;

  // Candlestick Geometry
  bodySize: number;
  upperWick: number;
  lowerWick: number;
  isBullishCandle: boolean;
  consecutiveBullish: number;
  consecutiveBearish: number;

  // Detected Patterns
  bullishEngulfing: boolean;
  bearishEngulfing: boolean;
  hammerPinbar: boolean;
  shootingStar: boolean;
  breakoutUp: boolean;
  breakoutDown: boolean;
  falseBreakout: boolean;
}

export interface MultiTimeframeSnapshot {
  tf1m: {
    trend: TrendDirection;
    rsi: number;
    emaBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  tf5m: {
    trend: TrendDirection;
    rsi: number;
    emaBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  tf15m: {
    trend: TrendDirection;
    rsi: number;
    emaBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  alignmentScore: number; // 0 to 100
}
