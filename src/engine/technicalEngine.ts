// src/engine/technicalEngine.ts

import { Candle } from '../types/market';
import { IndicatorValues } from '../types/indicators';

export class TechnicalEngine {
  /**
   * Compute exponential moving average array
   */
  public static calculateEMA(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    const k = 2 / (period + 1);
    const emaArray: number[] = new Array(values.length);
    
    // Initial SMA for the first period
    let sum = 0;
    const initialPeriod = Math.min(period, values.length);
    for (let i = 0; i < initialPeriod; i++) {
      sum += values[i];
      emaArray[i] = sum / (i + 1);
    }

    for (let i = initialPeriod; i < values.length; i++) {
      emaArray[i] = values[i] * k + emaArray[i - 1] * (1 - k);
    }

    return emaArray;
  }

  /**
   * Compute simple moving average
   */
  public static calculateSMA(values: number[], period: number): number[] {
    const smaArray: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        const slice = values.slice(0, i + 1);
        smaArray.push(slice.reduce((a, b) => a + b, 0) / slice.length);
      } else {
        const slice = values.slice(i - period + 1, i + 1);
        smaArray.push(slice.reduce((a, b) => a + b, 0) / period);
      }
    }
    return smaArray;
  }

  /**
   * Compute standard Wilder's RSI (14)
   */
  public static calculateRSI(closes: number[], period = 14): number[] {
    if (closes.length < 2) return closes.map(() => 50);

    const rsiArray: number[] = new Array(closes.length).fill(50);
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? Math.abs(diff) : 0);
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < closes.length; i++) {
      if (i > period) {
        avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
      }

      if (avgLoss === 0) {
        rsiArray[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiArray[i] = 100 - (100 / (1 + rs));
      }
    }

    return rsiArray;
  }

  /**
   * Compute MACD (fast: 12, slow: 26, signal: 9)
   */
  public static calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
    const fastEMA = this.calculateEMA(closes, fast);
    const slowEMA = this.calculateEMA(closes, slow);

    const macdLine = closes.map((_, i) => fastEMA[i] - slowEMA[i]);
    const signalLine = this.calculateEMA(macdLine, signal);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);

    return { macdLine, signalLine, histogram };
  }

  /**
   * Compute Bollinger Bands (20, 2)
   */
  public static calculateBollingerBands(closes: number[], period = 20, multiplier = 2) {
    const sma = this.calculateSMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];
    const width: number[] = [];
    const pctB: number[] = [];

    for (let i = 0; i < closes.length; i++) {
      const start = Math.max(0, i - period + 1);
      const slice = closes.slice(start, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / slice.length;
      const stdDev = Math.sqrt(variance);

      const up = mean + multiplier * stdDev;
      const low = mean - multiplier * stdDev;
      upper.push(up);
      lower.push(low);
      const bandW = mean !== 0 ? (up - low) / mean : 0;
      width.push(bandW);

      const pb = up !== low ? (closes[i] - low) / (up - low) : 0.5;
      pctB.push(pb);
    }

    return { upper, middle: sma, lower, width, pctB };
  }

  /**
   * Compute Average True Range (ATR 14)
   */
  public static calculateATR(candles: Candle[], period = 14): number[] {
    if (candles.length === 0) return [];
    const tr: number[] = [candles[0].high - candles[0].low];

    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high;
      const l = candles[i].low;
      const prevC = candles[i - 1].close;
      const currentTR = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      tr.push(currentTR);
    }

    return this.calculateEMA(tr, period);
  }

  /**
   * Compute ADX (Average Directional Index 14) + DI+ and DI-
   */
  public static calculateADX(candles: Candle[], period = 14) {
    const len = candles.length;
    if (len < period + 2) {
      return { adx: new Array(len).fill(25), diPlus: new Array(len).fill(20), diMinus: new Array(len).fill(20) };
    }

    const tr: number[] = [];
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];

    for (let i = 1; i < len; i++) {
      const upMove = candles[i].high - candles[i - 1].high;
      const downMove = candles[i - 1].low - candles[i].low;

      dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
      dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);

      const h = candles[i].high;
      const l = candles[i].low;
      const prevC = candles[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
    }

    const trSmooth = this.calculateEMA(tr, period);
    const dmPlusSmooth = this.calculateEMA(dmPlus, period);
    const dmMinusSmooth = this.calculateEMA(dmMinus, period);

    const diPlusArr: number[] = [20];
    const diMinusArr: number[] = [20];
    const dxArr: number[] = [20];

    for (let i = 0; i < trSmooth.length; i++) {
      const trVal = trSmooth[i] || 0.0001;
      const dp = (dmPlusSmooth[i] / trVal) * 100;
      const dm = (dmMinusSmooth[i] / trVal) * 100;
      diPlusArr.push(dp);
      diMinusArr.push(dm);

      const sum = dp + dm || 0.0001;
      const diff = Math.abs(dp - dm);
      dxArr.push((diff / sum) * 100);
    }

    const adxArr = this.calculateEMA(dxArr, period);
    return { adx: adxArr, diPlus: diPlusArr, diMinus: diMinusArr };
  }

  /**
   * Compute Stochastic Oscillator (%K, %D)
   */
  public static calculateStochastic(candles: Candle[], kPeriod = 14, dPeriod = 3) {
    const stochK: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const start = Math.max(0, i - kPeriod + 1);
      const slice = candles.slice(start, i + 1);
      const highestHigh = Math.max(...slice.map(c => c.high));
      const lowestLow = Math.min(...slice.map(c => c.low));
      const close = candles[i].close;

      const k = highestHigh !== lowestLow ? ((close - lowestLow) / (highestHigh - lowestLow)) * 100 : 50;
      stochK.push(k);
    }
    const stochD = this.calculateSMA(stochK, dPeriod);
    return { stochK, stochD };
  }

  /**
   * Compute Commodity Channel Index (CCI 20)
   */
  public static calculateCCI(candles: Candle[], period = 20): number[] {
    const tpArr = candles.map(c => (c.high + c.low + c.close) / 3);
    const smaTP = this.calculateSMA(tpArr, period);
    const cci: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const start = Math.max(0, i - period + 1);
      const slice = tpArr.slice(start, i + 1);
      const mean = smaTP[i];
      const meanDev = slice.reduce((acc, val) => acc + Math.abs(val - mean), 0) / slice.length;
      const c = meanDev !== 0 ? (tpArr[i] - mean) / (0.015 * meanDev) : 0;
      cci.push(c);
    }

    return cci;
  }

  /**
   * Compute Williams %R (14)
   */
  public static calculateWilliamsR(candles: Candle[], period = 14): number[] {
    const wr: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const start = Math.max(0, i - period + 1);
      const slice = candles.slice(start, i + 1);
      const highestHigh = Math.max(...slice.map(c => c.high));
      const lowestLow = Math.min(...slice.map(c => c.low));
      const close = candles[i].close;

      const r = highestHigh !== lowestLow ? ((highestHigh - close) / (highestHigh - lowestLow)) * -100 : -50;
      wr.push(r);
    }
    return wr;
  }

  /**
   * Identify Support & Resistance dynamic levels from local swing pivots
   */
  public static calculateSupportResistance(candles: Candle[]): { support: number; resistance: number } {
    if (candles.length < 10) {
      const last = candles[candles.length - 1];
      return { support: last.low * 0.998, resistance: last.high * 1.002 };
    }

    const highs: number[] = [];
    const lows: number[] = [];

    // Detect swing pivots (window of 3)
    for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      if (c.high >= candles[i - 1].high && c.high >= candles[i - 2].high && c.high >= candles[i + 1].high && c.high >= candles[i + 2].high) {
        highs.push(c.high);
      }
      if (c.low <= candles[i - 1].low && c.low <= candles[i - 2].low && c.low <= candles[i + 1].low && c.low <= candles[i + 2].low) {
        lows.push(c.low);
      }
    }

    const currentPrice = candles[candles.length - 1].close;
    
    // Nearest resistance above current price
    const resLevels = highs.filter(h => h >= currentPrice);
    const resistance = resLevels.length > 0 ? Math.min(...resLevels) : Math.max(...candles.slice(-20).map(c => c.high));

    // Nearest support below current price
    const supLevels = lows.filter(l => l <= currentPrice);
    const support = supLevels.length > 0 ? Math.max(...supLevels) : Math.min(...candles.slice(-20).map(c => c.low));

    return { support, resistance };
  }

  /**
   * Master feature extractor: strictly non-lookahead computation for the last candle in `candles`
   */
  public static extractFeatures(candles: Candle[]): IndicatorValues {
    const len = candles.length;
    if (len < 10) {
      throw new Error('Insufficient candles to extract technical features');
    }

    const lastCandle = candles[len - 1];
    const prevCandle = len > 1 ? candles[len - 2] : lastCandle;
    const closes = candles.map(c => c.close);

    // EMAs & SMAs
    const ema9Arr = this.calculateEMA(closes, 9);
    const ema21Arr = this.calculateEMA(closes, 21);
    const ema50Arr = this.calculateEMA(closes, Math.min(50, closes.length));
    const sma20Arr = this.calculateSMA(closes, Math.min(20, closes.length));

    const ema9 = ema9Arr[len - 1];
    const ema21 = ema21Arr[len - 1];
    const ema50 = ema50Arr[len - 1];
    const sma20 = sma20Arr[len - 1];

    const distanceFromEma9Pct = ((lastCandle.close - ema9) / (ema9 || 1)) * 100;
    const distanceFromEma21Pct = ((lastCandle.close - ema21) / (ema21 || 1)) * 100;

    // RSI
    const rsiArr = this.calculateRSI(closes, 14);
    const rsi14 = rsiArr[len - 1];
    const rsiPrev = rsiArr[len - 2] || rsi14;

    // MACD
    const { macdLine, signalLine, histogram } = this.calculateMACD(closes);
    const macdVal = macdLine[len - 1];
    const sigVal = signalLine[len - 1];
    const histVal = histogram[len - 1];
    const prevHistVal = histogram[len - 2] || 0;
    const macdCrossBullish = (histogram[len - 2] <= 0 && histVal > 0) || (macdVal > sigVal && macdLine[len - 2] <= signalLine[len - 2]);
    const macdCrossBearish = (histogram[len - 2] >= 0 && histVal < 0) || (macdVal < sigVal && macdLine[len - 2] >= signalLine[len - 2]);

    // Bollinger Bands
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[len - 1];
    const bbMiddle = bb.middle[len - 1];
    const bbLower = bb.lower[len - 1];
    const bbWidth = bb.width[len - 1];
    const bbPctB = bb.pctB[len - 1];

    // ATR
    const atrArr = this.calculateATR(candles, 14);
    const atr14 = atrArr[len - 1] || 0.0001;
    const atrPct = (atr14 / lastCandle.close) * 100;

    // ADX
    const adxData = this.calculateADX(candles, 14);
    const adx14 = adxData.adx[adxData.adx.length - 1] || 25;
    const diPlus = adxData.diPlus[adxData.diPlus.length - 1] || 20;
    const diMinus = adxData.diMinus[adxData.diMinus.length - 1] || 20;

    // Stochastics
    const stoch = this.calculateStochastic(candles, 14, 3);
    const stochK = stoch.stochK[len - 1];
    const stochD = stoch.stochD[len - 1];
    const stochRsiK = rsi14; // normalized proxy
    const stochRsiD = rsiPrev;

    // CCI & Williams %R
    const cciArr = this.calculateCCI(candles, 20);
    const cci = cciArr[len - 1] || 0;
    const wrArr = this.calculateWilliamsR(candles, 14);
    const williamsR = wrArr[len - 1] || -50;

    // Momentum & Microstructure
    const momentum1 = len >= 2 ? ((lastCandle.close - candles[len - 2].close) / candles[len - 2].close) * 100 : 0;
    const momentum3 = len >= 4 ? ((lastCandle.close - candles[len - 4].close) / candles[len - 4].close) * 100 : 0;
    const momentum5 = len >= 6 ? ((lastCandle.close - candles[len - 6].close) / candles[len - 6].close) * 100 : 0;
    const roc = momentum3;
    const prevMomentum1 = len >= 3 ? ((candles[len - 2].close - candles[len - 3].close) / candles[len - 3].close) * 100 : 0;
    const priceAcceleration = momentum1 - prevMomentum1;

    // Directional consistency in last 5 candles
    const recent5 = candles.slice(-5);
    const bullishIn5 = recent5.filter(c => c.close > c.open).length;
    const directionalConsistency = Math.max(bullishIn5, 5 - bullishIn5) / 5;

    // Support & Resistance
    const { support, resistance } = this.calculateSupportResistance(candles);
    const distToSupportPct = Math.abs((lastCandle.close - support) / lastCandle.close) * 100;
    const distToResistancePct = Math.abs((resistance - lastCandle.close) / lastCandle.close) * 100;
    
    // Rejection checks
    const nearSupportRejection = lastCandle.low <= support * 1.0005 && lastCandle.close > lastCandle.open;
    const nearResistanceRejection = lastCandle.high >= resistance * 0.9995 && lastCandle.close < lastCandle.open;

    // Candlestick Geometry
    const range = Math.max(lastCandle.high - lastCandle.low, 0.00001);
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const isBullishCandle = lastCandle.close >= lastCandle.open;
    const upperWick = isBullishCandle ? lastCandle.high - lastCandle.close : lastCandle.high - lastCandle.open;
    const lowerWick = isBullishCandle ? lastCandle.open - lastCandle.low : lastCandle.close - lastCandle.low;

    // Consecutive candle counts
    let consecutiveBullish = 0;
    let consecutiveBearish = 0;
    for (let i = len - 1; i >= 0; i--) {
      if (candles[i].close > candles[i].open) {
        if (consecutiveBearish > 0) break;
        consecutiveBullish++;
      } else if (candles[i].close < candles[i].open) {
        if (consecutiveBullish > 0) break;
        consecutiveBearish++;
      } else {
        break;
      }
    }

    // Candlestick patterns
    const prevRange = Math.max(prevCandle.high - prevCandle.low, 0.00001);
    const prevBody = Math.abs(prevCandle.close - prevCandle.open);
    const prevBullish = prevCandle.close >= prevCandle.open;

    const bullishEngulfing = !prevBullish && isBullishCandle && lastCandle.close > prevCandle.open && lastCandle.open < prevCandle.close;
    const bearishEngulfing = prevBullish && !isBullishCandle && lastCandle.close < prevCandle.open && lastCandle.open > prevCandle.close;

    const hammerPinbar = lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5 && bodySize > 0;
    const shootingStar = upperWick >= bodySize * 2 && lowerWick <= bodySize * 0.5 && bodySize > 0;

    const breakoutUp = lastCandle.close > resistance && prevCandle.close <= resistance;
    const breakoutDown = lastCandle.close < support && prevCandle.close >= support;
    const falseBreakout = (lastCandle.high > resistance && lastCandle.close < resistance && !isBullishCandle) ||
                          (lastCandle.low < support && lastCandle.close > support && isBullishCandle);

    return {
      ema9,
      ema21,
      ema50,
      sma20,
      distanceFromEma9Pct,
      distanceFromEma21Pct,
      rsi14,
      rsiPrev,
      stochK,
      stochD,
      stochRsiK,
      stochRsiD,
      cci,
      williamsR,
      macdLine: macdVal,
      signalLine: sigVal,
      macdHistogram: histVal,
      macdCrossBullish,
      macdCrossBearish,
      bbUpper,
      bbMiddle,
      bbLower,
      bbWidth,
      bbPctB,
      atr14,
      atrPct,
      adx14,
      diPlus,
      diMinus,
      momentum1,
      momentum3,
      momentum5,
      roc,
      priceAcceleration,
      directionalConsistency,
      supportLevel: support,
      resistanceLevel: resistance,
      distToSupportPct,
      distToResistancePct,
      nearSupportRejection,
      nearResistanceRejection,
      bodySize,
      upperWick,
      lowerWick,
      isBullishCandle,
      consecutiveBullish,
      consecutiveBearish,
      bullishEngulfing,
      bearishEngulfing,
      hammerPinbar,
      shootingStar,
      breakoutUp,
      breakoutDown,
      falseBreakout,
    };
  }
}
