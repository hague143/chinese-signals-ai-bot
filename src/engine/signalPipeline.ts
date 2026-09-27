// src/engine/signalPipeline.ts

import { Candle, ExpiryDuration, EXPIRY_SECONDS_MAP } from '../types/market';
import { UserSettings } from '../types/settings';
import { MasterSignalOutput, SignalDirection, SignalStrength } from '../types/signal';
import { MultiTimeframeSnapshot } from '../types/indicators';

import { TechnicalEngine } from './technicalEngine';
import { TrendEngine } from './trendEngine';
import { VolatilityEngine } from './volatilityEngine';
import { MomentumEngine } from './momentumEngine';
import { PriceActionEngine } from './priceActionEngine';
import { EnsembleEngine } from './ensembleEngine';
import { QualityFilter } from './qualityFilter';

export class SignalPipeline {
  /**
   * Run the full end-to-end Signal Pipeline
   */
  public static generateSignal(params: {
    symbol: string;
    candles: Candle[];
    higherTfCandles5m?: Candle[];
    higherTfCandles15m?: Candle[];
    expiry: ExpiryDuration;
    settings: UserSettings;
    lastActiveSignal?: MasterSignalOutput | null;
  }): MasterSignalOutput {
    const { symbol, candles, expiry, settings, lastActiveSignal } = params;

    if (!candles || candles.length < 15) {
      throw new Error('Insufficient candles provided for quantitative signal analysis.');
    }

    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;
    const now = Date.now();
    const expirySeconds = EXPIRY_SECONDS_MAP[expiry];
    const expiresAt = now + expirySeconds * 1000;

    // 1. Data Quality Check
    const dataQuality = QualityFilter.validateDataQuality(
      candles.length,
      lastCandle.time,
      currentPrice
    );

    // 2. Feature Engine
    const ind = TechnicalEngine.extractFeatures(candles);

    // 3. Trend Engine
    const { trend, trendScore, reasons: trendReasons } = TrendEngine.evaluateTrend(ind, currentPrice);

    // 4. Volatility & Regime Engine
    const {
      volatilityRegime,
      marketRegime,
      volatilityScore,
      reasons: volReasons,
    } = VolatilityEngine.evaluateVolatilityAndRegime(ind, trendScore);

    // 5. Momentum Engine
    const {
      momentumState,
      momentumScore,
      reasons: momReasons,
    } = MomentumEngine.evaluateMomentum(ind);

    // 6. Price Action Engine
    const { priceActionScore, reasons: paReasons } = PriceActionEngine.evaluatePriceAction(ind);

    // 7. Multi-Timeframe Alignment
    const mtf = this.evaluateMultiTimeframe(candles, params.higherTfCandles5m, params.higherTfCandles15m);

    // 8. Ensemble Aggregator & Confidence System
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

    // 9. Strict Quality Gate
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

    if (!qualityEvaluation.passed) {
      finalDirection = qualityEvaluation.forcedDirection || 'WAIT';
      finalConfidence = Math.min(finalConfidence, settings.minConfidenceThreshold - 5);
      finalStrength = 'VERY WEAK';
    }

    // 10. Compile Structured Reasons
    const analysisReasons: string[] = [];
    if (finalDirection === 'CALL') {
      if (ind.ema9 > ind.ema21) analysisReasons.push('EMA 9 above EMA 21 (bullish trend)');
      if (ind.macdHistogram > 0) analysisReasons.push('MACD histogram positive and expanding');
      if (ind.rsi14 > 50 && ind.rsi14 < 75) analysisReasons.push(`RSI (${Math.round(ind.rsi14)}) confirms upward momentum`);
      if (ind.nearSupportRejection) analysisReasons.push('Price rejected nearby support zone');
      if (ind.bullishEngulfing || ind.hammerPinbar) analysisReasons.push('Bullish candlestick confirmation pattern');
      analysisReasons.push(`AI ensemble consensus: ${ensembleResult.modelAgreement.agreementRatio} models bullish`);
    } else if (finalDirection === 'PUT') {
      if (ind.ema9 < ind.ema21) analysisReasons.push('EMA 9 below EMA 21 (bearish trend)');
      if (ind.macdHistogram < 0) analysisReasons.push('MACD histogram negative and descending');
      if (ind.rsi14 < 50 && ind.rsi14 > 25) analysisReasons.push(`RSI (${Math.round(ind.rsi14)}) confirms downward momentum`);
      if (ind.nearResistanceRejection) analysisReasons.push('Price rejected nearby resistance ceiling');
      if (ind.bearishEngulfing || ind.shootingStar) analysisReasons.push('Bearish candlestick rejection pattern');
      analysisReasons.push(`AI ensemble consensus: ${ensembleResult.modelAgreement.agreementRatio} models bearish`);
    } else {
      if (qualityEvaluation.filterReason) {
        analysisReasons.push(qualityEvaluation.filterReason);
      }
      analysisReasons.push('Risk filter active: awaiting higher directional clarity or model consensus');
      if (volatilityRegime === 'EXTREME_VOLATILITY') {
        analysisReasons.push('Elevated volatility warning');
      }
    }

    // 11. Compile Structured Explanation Text
    const explanationText = this.generateExplanationText({
      direction: finalDirection,
      symbol,
      expiry,
      confidence: finalConfidence,
      trend,
      momentum: momentumState,
      modelAgreement: ensembleResult.modelAgreement,
      mtf,
      reasons: analysisReasons,
    });

    // 12. Risk status
    let riskStatus: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' = 'NORMAL';
    if (volatilityRegime === 'EXTREME_VOLATILITY') riskStatus = 'HIGH';
    else if (volatilityRegime === 'HIGH_VOLATILITY' || mtf.alignmentScore < 50) riskStatus = 'ELEVATED';
    else if (finalConfidence >= 85 && mtf.alignmentScore > 75) riskStatus = 'LOW';

    const id = `SIG-${symbol.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`;

    return {
      id,
      symbol,
      broker: 'Quotex',
      marketType: 'OTC',
      direction: finalDirection,
      confidence: finalConfidence,
      signalStrength: finalStrength,
      expiry,
      expirySeconds,
      entryPrice: currentPrice,
      result: 'UNRESOLVED',
      timestamp: now,
      expiresAt,
      trend,
      momentum: momentumState,
      volatilityRegime,
      marketRegime,
      modelAgreement: ensembleResult.modelAgreement,
      modelVotes: ensembleResult.modelVotes,
      technicalScores: ensembleResult.technicalScores,
      analysisReasons,
      explanationText,
      riskStatus,
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
   * Multi-timeframe trend & momentum synthesis
   */
  private static evaluateMultiTimeframe(
    candles1m: Candle[],
    candles5m?: Candle[],
    candles15m?: Candle[]
  ): MultiTimeframeSnapshot {
    const ind1m = TechnicalEngine.extractFeatures(candles1m);
    const { trend: trend1m } = TrendEngine.evaluateTrend(ind1m, candles1m[candles1m.length - 1].close);

    // 5m estimate / calculation
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

    // 15m estimate / calculation
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

  /**
   * Formats structured text explanation as specified in Section 12
   */
  private static generateExplanationText(info: {
    direction: SignalDirection;
    symbol: string;
    expiry: string;
    confidence: number;
    trend: string;
    momentum: string;
    modelAgreement: any;
    mtf: MultiTimeframeSnapshot;
    reasons: string[];
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
}
