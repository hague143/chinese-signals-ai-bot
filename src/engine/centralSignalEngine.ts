// src/engine/centralSignalEngine.ts

import { Candle, ExpiryDuration, EXPIRY_SECONDS_MAP } from '../types/market';
import { UserSettings } from '../types/settings';
import {
  MasterSignalOutput,
  SignalDirection,
  SignalStrength,
  IndicatorsSummary,
} from '../types/signal';
import { TechnicalEngine } from './technicalEngine';
import { TrendEngine } from './trendEngine';
import { VolatilityEngine } from './volatilityEngine';
import { MomentumEngine } from './momentumEngine';
import { PriceActionEngine } from './priceActionEngine';
import { EnsembleEngine } from './ensembleEngine';
import { QualityFilter } from './qualityFilter';
import { MultiTimeframeSnapshot } from '../types/indicators';

export interface SignalRequestOptions {
  pair: string;
  market?: 'OTC' | 'LIVE';
  timeframe?: string;
  expiry?: ExpiryDuration;
  candles: Candle[];
  higherTfCandles5m?: Candle[];
  higherTfCandles15m?: Candle[];
  mode?: 'CLOSED_CANDLE' | 'LIVE_CANDLE';
  dataSource?: string;
  settings: UserSettings;
  lastActiveSignal?: MasterSignalOutput | null;
  forceRecalculate?: boolean;
}

export class CentralSignalEngine {
  private static cache: Map<string, MasterSignalOutput> = new Map();
  private static maxCacheSize = 500;

  /**
   * Primary entry point: Get existing cached signal or deterministically evaluate a new one
   */
  public static getOrGenerateSignal(options: SignalRequestOptions): MasterSignalOutput {
    const pair = options.pair || 'EUR/USD OTC';
    const market = options.market || 'OTC';
    const expiry = options.expiry || '30s';
    const timeframe = options.timeframe || (expiry === '1m' ? '1m' : '1m');
    const mode = options.mode || 'CLOSED_CANDLE';
    const dataSource = options.dataSource || 'Quotex OTC Demo Simulator';
    const rawCandles = options.candles;

    // 1. Data Validation
    const validation = this.validateCandleData(rawCandles);
    if (!validation.isValid) {
      const fallbackTime = Date.now();
      const lastPrice = rawCandles && rawCandles.length > 0 ? rawCandles[rawCandles.length - 1].close : 1.0;
      return this.createNoTradeSignal({
        pair,
        market,
        expiry,
        timeframe,
        mode,
        dataSource,
        entryPrice: lastPrice,
        candleTimestamp: fallbackTime,
        dataTimestamp: fallbackTime,
        reason: validation.reason || 'Invalid candle data structure',
        settings: options.settings,
      });
    }

    // Determine the active evaluated candle
    const lastCandle = rawCandles[rawCandles.length - 1];
    const candleTimestamp = lastCandle.time * 1000;
    const cacheKey = `${pair}:${market}:${timeframe}:${candleTimestamp}:${mode}`;

    // 2. Check canonical cache
    if (!options.forceRecalculate && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    // 3. Run Quantitative Evaluation
    const signal = this.calculateAuthoritativeSignal({
      pair,
      market,
      expiry,
      timeframe,
      mode,
      dataSource,
      candles: rawCandles,
      higherTfCandles5m: options.higherTfCandles5m,
      higherTfCandles15m: options.higherTfCandles15m,
      settings: options.settings,
      lastActiveSignal: options.lastActiveSignal,
      cacheKey,
      candleTimestamp,
    });

    // 4. Store in canonical cache
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, signal);

    // 5. Output Debug Log
    this.logDebugOutput(signal);

    return signal;
  }

  /**
   * Realtime Data Validation
   */
  public static validateCandleData(candles: Candle[]): { isValid: boolean; reason?: string } {
    if (!candles || !Array.isArray(candles) || candles.length < 15) {
      return { isValid: false, reason: `Insufficient candles: expected >= 15, received ${candles?.length || 0}` };
    }

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (
        typeof c.open !== 'number' || isNaN(c.open) || c.open <= 0 ||
        typeof c.high !== 'number' || isNaN(c.high) || c.high <= 0 ||
        typeof c.low !== 'number' || isNaN(c.low) || c.low <= 0 ||
        typeof c.close !== 'number' || isNaN(c.close) || c.close <= 0 ||
        typeof c.time !== 'number' || isNaN(c.time) || c.time <= 0
      ) {
        return { isValid: false, reason: `Corrupt OHLC data at index ${i}` };
      }

      // High / Low boundary validation
      if (c.high < c.low) {
        return { isValid: false, reason: `Invalid bar: High (${c.high}) < Low (${c.low}) at index ${i}` };
      }
      if (c.high < c.open || c.high < c.close) {
        return { isValid: false, reason: `Invalid bar: High is lower than Open/Close at index ${i}` };
      }
      if (c.low > c.open || c.low > c.close) {
        return { isValid: false, reason: `Invalid bar: Low is higher than Open/Close at index ${i}` };
      }

      // Check timestamp sequentiality
      if (i > 0 && c.time <= candles[i - 1].time) {
        return { isValid: false, reason: `Non-sequential candle timestamps at index ${i}` };
      }
    }

    return { isValid: true };
  }

  /**
   * Deterministic authoritative calculation
   */
  private static calculateAuthoritativeSignal(params: {
    pair: string;
    market: 'OTC' | 'LIVE';
    expiry: ExpiryDuration;
    timeframe: string;
    mode: 'CLOSED_CANDLE' | 'LIVE_CANDLE';
    dataSource: string;
    candles: Candle[];
    higherTfCandles5m?: Candle[];
    higherTfCandles15m?: Candle[];
    settings: UserSettings;
    lastActiveSignal?: MasterSignalOutput | null;
    cacheKey: string;
    candleTimestamp: number;
  }): MasterSignalOutput {
    const {
      pair,
      market,
      expiry,
      timeframe,
      mode,
      dataSource,
      candles,
      settings,
      lastActiveSignal,
      cacheKey,
      candleTimestamp,
    } = params;

    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;
    const now = Date.now();
    const expirySeconds = EXPIRY_SECONDS_MAP[expiry] || 30;
    const expiresAt = now + expirySeconds * 1000;

    // 1. Data Quality Check
    const dataQuality = QualityFilter.validateDataQuality(
      candles.length,
      lastCandle.time,
      currentPrice
    );

    // 2. Extract technical features
    const ind = TechnicalEngine.extractFeatures(candles);

    // 3. Trend Analysis
    const { trend, trendScore } = TrendEngine.evaluateTrend(ind, currentPrice);

    // 4. Volatility & Regime Analysis
    const {
      volatilityRegime,
      marketRegime,
      volatilityScore,
    } = VolatilityEngine.evaluateVolatilityAndRegime(ind, trendScore);

    // 5. Momentum Analysis
    const { momentumState, momentumScore } = MomentumEngine.evaluateMomentum(ind);

    // 6. Price Action Analysis
    const { priceActionScore } = PriceActionEngine.evaluatePriceAction(ind);

    // 7. Multi-Timeframe Alignment
    const mtf = this.evaluateMultiTimeframe(candles, params.higherTfCandles5m, params.higherTfCandles15m);

    // 8. Explicit Deterministic Evidence Scoring
    let bullishScore = 0;
    let bearishScore = 0;
    const analysisReasons: string[] = [];

    // Trend Evidence
    if (ind.ema9 > ind.ema21) {
      bullishScore += 2;
      analysisReasons.push('EMA 9 > EMA 21 (bullish trend alignment)');
    } else if (ind.ema9 < ind.ema21) {
      bearishScore += 2;
      analysisReasons.push('EMA 9 < EMA 21 (bearish trend alignment)');
    }

    if (currentPrice > ind.ema50) {
      bullishScore += 1;
    } else if (currentPrice < ind.ema50) {
      bearishScore += 1;
    }

    // Momentum & MACD Evidence
    if (ind.macdHistogram > 0) {
      bullishScore += 2;
      analysisReasons.push('MACD histogram positive and expanding');
    } else if (ind.macdHistogram < 0) {
      bearishScore += 2;
      analysisReasons.push('MACD histogram negative and descending');
    }

    // RSI Evidence
    if (ind.rsi14 >= 52 && ind.rsi14 <= 75) {
      bullishScore += 2;
      analysisReasons.push(`RSI (${Math.round(ind.rsi14)}) confirms bullish upward momentum`);
    } else if (ind.rsi14 <= 48 && ind.rsi14 >= 25) {
      bearishScore += 2;
      analysisReasons.push(`RSI (${Math.round(ind.rsi14)}) confirms bearish downward momentum`);
    } else if (ind.rsi14 > 75) {
      bearishScore += 1;
      analysisReasons.push('RSI entering overbought exhaustion zone');
    } else if (ind.rsi14 < 25) {
      bullishScore += 1;
      analysisReasons.push('RSI entering oversold rebound zone');
    }

    // Price Action & S/R Evidence
    if (ind.nearSupportRejection) {
      bullishScore += 2;
      analysisReasons.push('Price rejected nearby support floor');
    }
    if (ind.nearResistanceRejection) {
      bearishScore += 2;
      analysisReasons.push('Price rejected nearby resistance ceiling');
    }

    if (ind.bullishEngulfing || ind.hammerPinbar) {
      bullishScore += 2;
      analysisReasons.push('Bullish candlestick confirmation pattern');
    }
    if (ind.bearishEngulfing || ind.shootingStar) {
      bearishScore += 2;
      analysisReasons.push('Bearish candlestick confirmation pattern');
    }

    // 9. AI Model Ensemble
    const ensembleResult = EnsembleEngine.aggregate(
      ind,
      currentPrice,
      expiry,
      settings,
      mtf,
      trendScore,
      momentumScore,
      priceActionScore,
      volatilityScore,
      marketRegime,
      volatilityRegime
    );

    // 10. Quality Gating
    const qualityEvaluation = QualityFilter.evaluateSignalFitness(
      ensembleResult.direction,
      ensembleResult.confidence,
      ensembleResult.modelAgreement,
      volatilityRegime,
      marketRegime,
      dataQuality,
      settings,
      lastActiveSignal
    );

    let finalDirection: SignalDirection = ensembleResult.direction;
    let finalConfidence = ensembleResult.confidence;
    let finalStrength: SignalStrength = ensembleResult.signalStrength;

    // Evidence Consensus check
    if (bullishScore >= bearishScore + 2 && ensembleResult.direction === 'CALL') {
      finalDirection = 'CALL';
    } else if (bearishScore >= bullishScore + 2 && ensembleResult.direction === 'PUT') {
      finalDirection = 'PUT';
    } else if (bullishScore === bearishScore || Math.abs(bullishScore - bearishScore) < 2) {
      // Ambiguous market condition
      if (finalConfidence < 78) {
        finalDirection = 'WAIT';
      }
    }

    if (!qualityEvaluation.passed) {
      finalDirection = qualityEvaluation.forcedDirection || 'WAIT';
      finalConfidence = Math.min(finalConfidence, settings.minConfidenceThreshold - 5);
      finalStrength = 'VERY WEAK';
    }

    if (finalDirection === 'CALL') {
      analysisReasons.push(`AI ensemble consensus: ${ensembleResult.modelAgreement.agreementRatio} models bullish`);
    } else if (finalDirection === 'PUT') {
      analysisReasons.push(`AI ensemble consensus: ${ensembleResult.modelAgreement.agreementRatio} models bearish`);
    } else {
      if (qualityEvaluation.filterReason) {
        analysisReasons.push(qualityEvaluation.filterReason);
      }
      analysisReasons.push('Risk filter active: awaiting directional clarity or model consensus');
    }

    // 11. Compile Structured Explanation Text
    const explanationText = this.generateExplanationText({
      direction: finalDirection,
      symbol: pair,
      expiry,
      confidence: finalConfidence,
      trend,
      momentum: momentumState,
      modelAgreement: ensembleResult.modelAgreement,
      mtf,
    });

    let riskStatus: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' = 'NORMAL';
    if (volatilityRegime === 'EXTREME_VOLATILITY') riskStatus = 'HIGH';
    else if (volatilityRegime === 'HIGH_VOLATILITY' || mtf.alignmentScore < 50) riskStatus = 'ELEVATED';
    else if (finalConfidence >= 85 && mtf.alignmentScore > 75) riskStatus = 'LOW';

    const indicatorsSummary: IndicatorsSummary = {
      rsi: Math.round(ind.rsi14 * 10) / 10,
      ema9: ind.ema9,
      ema21: ind.ema21,
      ema50: ind.ema50,
      macd: {
        line: ind.macdLine,
        signal: ind.signalLine,
        histogram: ind.macdHistogram,
      },
      bollingerBands: {
        upper: ind.bbUpper,
        middle: ind.bbMiddle,
        lower: ind.bbLower,
      },
      stochastic: {
        k: Math.round(ind.stochK * 10) / 10,
        d: Math.round(ind.stochD * 10) / 10,
      },
      adx: Math.round(ind.adx14 * 10) / 10,
      atr: ind.atr14,
      cci: Math.round(ind.cci * 10) / 10,
      support: ind.supportLevel,
      resistance: ind.resistanceLevel,
    };

    const id = `SIG-${pair.replace(/[^A-Za-z0-9]/g, '')}-${candleTimestamp}`;

    return {
      id,
      cacheKey,
      symbol: pair,
      pair,
      broker: 'Quotex',
      marketType: 'OTC',
      direction: finalDirection,
      signal: finalDirection,
      confidence: finalConfidence,
      bullishScore,
      bearishScore,
      signalStrength: finalStrength,
      expiry,
      expirySeconds,
      timeframe,
      entryPrice: currentPrice,
      result: 'UNRESOLVED',
      timestamp: now,
      candleTimestamp,
      dataTimestamp: lastCandle.time * 1000,
      dataSource,
      signalMode: mode,
      expiresAt,
      trend,
      momentum: momentumState,
      volatilityRegime,
      marketRegime,
      modelAgreement: ensembleResult.modelAgreement,
      modelVotes: ensembleResult.modelVotes,
      technicalScores: ensembleResult.technicalScores,
      indicatorsSummary,
      reasons: analysisReasons,
      analysisReasons,
      explanationText,
      riskStatus,
      isValid: true,
      dataQuality: {
        isFresh: dataQuality.isFresh,
        qualityLevel: dataQuality.qualityLevel,
        score: dataQuality.qualityScore,
      },
      multiTimeframe: {
        tf1m: mtf.tf1m.trend.replace('_', ' '),
        tf5m: mtf.tf5m.trend.replace('_', ' '),
        tf15m: mtf.tf15m.trend.replace('_', ' '),
        alignment: `${Math.round(mtf.alignmentScore)}% Alignment`,
      },
    };
  }

  /**
   * Helper to construct a NO_TRADE / WAIT signal when data or conditions are invalid
   */
  private static createNoTradeSignal(info: {
    pair: string;
    market: 'OTC' | 'LIVE';
    expiry: ExpiryDuration;
    timeframe: string;
    mode: 'CLOSED_CANDLE' | 'LIVE_CANDLE';
    dataSource: string;
    entryPrice: number;
    candleTimestamp: number;
    dataTimestamp: number;
    reason: string;
    settings: UserSettings;
  }): MasterSignalOutput {
    const now = Date.now();
    const expirySeconds = EXPIRY_SECONDS_MAP[info.expiry] || 30;
    const id = `SIG-${info.pair.replace(/[^A-Za-z0-9]/g, '')}-${info.candleTimestamp}`;
    const cacheKey = `${info.pair}:${info.market}:${info.timeframe}:${info.candleTimestamp}:${info.mode}`;

    return {
      id,
      cacheKey,
      symbol: info.pair,
      pair: info.pair,
      broker: 'Quotex',
      marketType: 'OTC',
      direction: 'WAIT',
      signal: 'WAIT',
      confidence: 50,
      bullishScore: 0,
      bearishScore: 0,
      signalStrength: 'VERY WEAK',
      expiry: info.expiry,
      expirySeconds,
      timeframe: info.timeframe,
      entryPrice: info.entryPrice,
      result: 'UNRESOLVED',
      timestamp: now,
      candleTimestamp: info.candleTimestamp,
      dataTimestamp: info.dataTimestamp,
      dataSource: info.dataSource,
      signalMode: info.mode,
      expiresAt: now + expirySeconds * 1000,
      trend: 'SIDEWAYS',
      momentum: 'Neutral',
      volatilityRegime: 'NORMAL_VOLATILITY',
      marketRegime: 'RANGING',
      modelAgreement: {
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 6,
        totalModels: 6,
        agreementRatio: '0/6',
        isConsensus: false,
      },
      modelVotes: {
        momentumModel: { direction: 'WAIT', score: 50, weight: 20, reason: info.reason },
        trendModel: { direction: 'WAIT', score: 50, weight: 15, reason: info.reason },
        meanReversionModel: { direction: 'WAIT', score: 50, weight: 10, reason: info.reason },
        priceActionModel: { direction: 'WAIT', score: 50, weight: 15, reason: info.reason },
        regimeModel: { direction: 'WAIT', score: 50, weight: 10, reason: info.reason },
        mlPredictionModel: { direction: 'WAIT', score: 50, weight: 20, reason: info.reason },
      },
      technicalScores: {
        technicalAgreementScore: 0,
        trendScore: 50,
        momentumScore: 50,
        priceActionScore: 50,
        volatilityScore: 50,
        mlPredictionScore: 50,
      },
      indicatorsSummary: {
        rsi: 50,
        ema9: info.entryPrice,
        ema21: info.entryPrice,
        ema50: info.entryPrice,
        macd: { line: 0, signal: 0, histogram: 0 },
        bollingerBands: { upper: info.entryPrice * 1.001, middle: info.entryPrice, lower: info.entryPrice * 0.999 },
        stochastic: { k: 50, d: 50 },
        adx: 20,
        atr: 0.0001,
        cci: 0,
        support: info.entryPrice * 0.998,
        resistance: info.entryPrice * 1.002,
      },
      reasons: [info.reason],
      analysisReasons: [info.reason],
      explanationText: `NO TRADE recommendation for ${info.pair}: ${info.reason}. System preserves capital when reliable market evidence is unavailable.`,
      riskStatus: 'HIGH',
      isValid: false,
      validationReason: info.reason,
      dataQuality: {
        isFresh: false,
        qualityLevel: 'LOW',
        score: 20,
      },
      multiTimeframe: {
        tf1m: 'SIDEWAYS',
        tf5m: 'SIDEWAYS',
        tf15m: 'SIDEWAYS',
        alignment: '0% Alignment',
      },
    };
  }

  /**
   * Multi-timeframe synthesis
   */
  private static evaluateMultiTimeframe(
    candles1m: Candle[],
    candles5m?: Candle[],
    candles15m?: Candle[]
  ): MultiTimeframeSnapshot {
    const ind1m = TechnicalEngine.extractFeatures(candles1m);
    const { trend: trend1m } = TrendEngine.evaluateTrend(ind1m, candles1m[candles1m.length - 1].close);

    let trend5m = trend1m;
    let rsi5m = ind1m.rsi14;
    let bias5m: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = ind1m.ema9 > ind1m.ema21 ? 'BULLISH' : 'BEARISH';

    if (candles5m && candles5m.length >= 15) {
      const ind5m = TechnicalEngine.extractFeatures(candles5m);
      const res5m = TrendEngine.evaluateTrend(ind5m, candles5m[candles5m.length - 1].close);
      trend5m = res5m.trend;
      rsi5m = ind5m.rsi14;
      bias5m = ind5m.ema9 > ind5m.ema21 ? 'BULLISH' : 'BEARISH';
    }

    let trend15m = trend5m;
    let rsi15m = rsi5m;
    let bias15m: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = bias5m;

    if (candles15m && candles15m.length >= 15) {
      const ind15m = TechnicalEngine.extractFeatures(candles15m);
      const res15m = TrendEngine.evaluateTrend(ind15m, candles15m[candles15m.length - 1].close);
      trend15m = res15m.trend;
      rsi15m = ind15m.rsi14;
      bias15m = ind15m.ema9 > ind15m.ema21 ? 'BULLISH' : 'BEARISH';
    }

    let alignmentScore = 50;
    const isAllBullish = (trend1m.includes('UP') || bias5m === 'BULLISH') && bias5m === 'BULLISH' && bias15m === 'BULLISH';
    const isAllBearish = (trend1m.includes('DOWN') || bias5m === 'BEARISH') && bias5m === 'BEARISH' && bias15m === 'BEARISH';

    if (isAllBullish || isAllBearish) alignmentScore = 95;
    else if (bias5m === (trend1m.includes('UP') ? 'BULLISH' : 'BEARISH')) alignmentScore = 75;
    else alignmentScore = 40;

    return {
      tf1m: {
        trend: trend1m,
        rsi: Math.round(ind1m.rsi14),
        emaBias: ind1m.ema9 > ind1m.ema21 ? 'BULLISH' : 'BEARISH',
      },
      tf5m: {
        trend: trend5m,
        rsi: Math.round(rsi5m),
        emaBias: bias5m,
      },
      tf15m: {
        trend: trend15m,
        rsi: Math.round(rsi15m),
        emaBias: bias15m,
      },
      alignmentScore,
    };
  }

  private static generateExplanationText(info: {
    direction: SignalDirection;
    symbol: string;
    expiry: string;
    confidence: number;
    trend: string;
    momentum: string;
    modelAgreement: any;
    mtf: MultiTimeframeSnapshot;
  }): string {
    if (info.direction === 'WAIT') {
      return `WAIT recommendation for ${info.symbol}: Market conditions lack sufficient directional consensus (${info.modelAgreement.agreementRatio} models agreed). Volatility or multi-timeframe divergence suggests standing aside until clear structure emerges.`;
    }

    const directionTerm = info.direction === 'CALL' ? 'CALL (predicted upward movement)' : 'PUT (predicted downward movement)';
    const mtfNote = info.mtf.alignmentScore > 70 
      ? 'Supported by multi-timeframe EMA alignment on 1m and 5m structures.'
      : 'Confidence is moderated slightly due to neutral higher timeframe bias.';

    return `${directionTerm} signal generated for ${info.symbol} on ${info.expiry} timer with ${Math.round(info.confidence)}% calculated confidence. Primary drivers: ${info.momentum} momentum, ${info.trend.replace('_', ' ').toLowerCase()} trend alignment, and ${info.modelAgreement.agreementRatio} AI models in consensus. ${mtfNote}`;
  }

  /**
   * Section 15 Debug Output Logger
   */
  private static logDebugOutput(signal: MasterSignalOutput): void {
    const candleTimeStr = new Date(signal.candleTimestamp).toISOString();
    const dataTimeStr = new Date(signal.dataTimestamp).toISOString();
    console.log(
      `[CENTRAL SIGNAL ENGINE] ` +
      `PAIR: ${signal.symbol} | ` +
      `TIMEFRAME: ${signal.timeframe} (${signal.expiry}) | ` +
      `MODE: ${signal.signalMode} | ` +
      `CANDLE: ${candleTimeStr} | ` +
      `DATA: ${dataTimeStr} | ` +
      `SRC: ${signal.dataSource} | ` +
      `SIGNAL: ${signal.direction} | ` +
      `CONF: ${signal.confidence}% | ` +
      `BULLISH: ${signal.bullishScore} | ` +
      `BEARISH: ${signal.bearishScore} | ` +
      `MODELS: ${signal.modelAgreement.agreementRatio} | ` +
      `RSI: ${signal.indicatorsSummary.rsi} | ` +
      `ENTRY: ${signal.entryPrice}`
    );
  }

  /**
   * Clear in-memory canonical cache
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}
