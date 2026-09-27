// src/engine/qualityFilter.ts

import { DataQualityReport } from '../types/market';
import { UserSettings } from '../types/settings';
import { SignalDirection, ModelAgreement, MasterSignalOutput } from '../types/signal';
import { VolatilityRegime, MarketRegimeType } from '../types/indicators';

export interface QualityValidationResult {
  passed: boolean;
  forcedDirection?: SignalDirection;
  filterReason?: string;
  dataQualityScore: number;
  dataQualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'STALE';
}

export class QualityFilter {
  /**
   * Assess data feed health and market condition fitness
   */
  public static validateDataQuality(
    candlesCount: number,
    lastCandleTimestampSec: number,
    currentPrice: number
  ): DataQualityReport {
    const nowSec = Math.floor(Date.now() / 1000);
    const ageSec = Math.abs(nowSec - lastCandleTimestampSec);

    // Accept up to 180 seconds since last completed 1m candle
    const isFresh = ageSec <= 180;
    const hasGaps = ageSec > 300;
    const priceSpikeDetected = currentPrice <= 0 || !Number.isFinite(currentPrice);
    
    let qualityScore = 100;
    if (!isFresh) qualityScore -= 30;
    if (hasGaps) qualityScore -= 30;
    if (candlesCount < 15) qualityScore -= 40;
    if (priceSpikeDetected) qualityScore = 0;

    let qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'STALE' = 'HIGH';
    let statusMessage = 'Optimal feed connection';

    if (qualityScore < 30 || priceSpikeDetected) {
      qualityLevel = 'STALE';
      statusMessage = 'DATA STALE / WAITING FOR LIVE DATA';
    } else if (qualityScore < 60) {
      qualityLevel = 'LOW';
      statusMessage = 'Degraded feed latency / Potential gap';
    } else if (qualityScore < 85) {
      qualityLevel = 'MEDIUM';
      statusMessage = 'Adequate feed history';
    }

    return {
      isFresh: qualityScore >= 40,
      candleCount: candlesCount,
      timeSinceLastTickMs: ageSec * 1000,
      hasGaps,
      priceSpikeDetected,
      qualityScore: Math.max(0, qualityScore),
      qualityLevel,
      statusMessage,
    };
  }

  /**
   * Apply strict signal quality gating
   */
  public static evaluateSignalFitness(
    rawDirection: SignalDirection,
    rawConfidence: number,
    modelAgreement: ModelAgreement,
    volatilityRegime: VolatilityRegime,
    marketRegime: MarketRegimeType,
    dataQuality: DataQualityReport,
    settings: UserSettings,
    lastActiveSignal?: MasterSignalOutput | null
  ): QualityValidationResult {
    // 1. Data freshness gate
    if (!dataQuality.isFresh || dataQuality.qualityLevel === 'STALE') {
      return {
        passed: false,
        forcedDirection: 'WAIT',
        filterReason: 'DATA STALE: Waiting for live synced tick updates',
        dataQualityScore: dataQuality.qualityScore,
        dataQualityLevel: dataQuality.qualityLevel,
      };
    }

    // 2. Minimum Confidence Threshold
    if (rawConfidence < settings.minConfidenceThreshold) {
      return {
        passed: false,
        forcedDirection: 'WAIT',
        filterReason: `Confidence (${Math.round(rawConfidence)}%) is below minimum threshold (${settings.minConfidenceThreshold}%)`,
        dataQualityScore: dataQuality.qualityScore,
        dataQualityLevel: dataQuality.qualityLevel,
      };
    }

    // 3. Model Consensus requirement (only if explicitly enabled in settings)
    if (settings.requireModelConsensus && !modelAgreement.isConsensus) {
      return {
        passed: false,
        forcedDirection: 'WAIT',
        filterReason: `Model divergence detected (${modelAgreement.agreementRatio} models agree) — consensus required`,
        dataQualityScore: dataQuality.qualityScore,
        dataQualityLevel: dataQuality.qualityLevel,
      };
    }

    // 4. Extreme Volatility / Whipsaw filter
    if (volatilityRegime === 'EXTREME_VOLATILITY') {
      return {
        passed: false,
        forcedDirection: 'WAIT',
        filterReason: 'Extreme volatility anomaly — risk filter active to prevent whipsaw losses',
        dataQualityScore: dataQuality.qualityScore,
        dataQualityLevel: dataQuality.qualityLevel,
      };
    }

    // 5. Signal Cooldown & Contradictory signal filter
    if (lastActiveSignal && lastActiveSignal.direction !== 'WAIT' && settings.signalCooldownSeconds > 0) {
      const now = Date.now();
      const timeSinceLastSec = (now - lastActiveSignal.timestamp) / 1000;
      
      if (timeSinceLastSec < settings.signalCooldownSeconds) {
        if (rawDirection !== lastActiveSignal.direction && rawConfidence < 85) {
          return {
            passed: false,
            forcedDirection: 'WAIT',
            filterReason: `Signal cooldown active (${Math.ceil(settings.signalCooldownSeconds - timeSinceLastSec)}s left) — preventing conflicting flip-flop`,
            dataQualityScore: dataQuality.qualityScore,
            dataQualityLevel: dataQuality.qualityLevel,
          };
        }
      }
    }

    return {
      passed: true,
      dataQualityScore: dataQuality.qualityScore,
      dataQualityLevel: dataQuality.qualityLevel,
    };
  }
}
