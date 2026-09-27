// src/engine/ensembleEngine.ts

import { IndicatorValues, MultiTimeframeSnapshot } from '../types/indicators';
import { ExpiryDuration } from '../types/market';
import { UserSettings } from '../types/settings';
import {
  SignalDirection,
  SignalStrength,
  ModelVotes,
  ModelAgreement,
  TechnicalScores,
} from '../types/signal';

import { MomentumModel } from './models/momentumModel';
import { TrendModel } from './models/trendModel';
import { MeanReversionModel } from './models/meanReversionModel';
import { PriceActionModel } from './models/priceActionModel';
import { RegimeModel } from './models/regimeModel';
import { MLInferenceModel } from './models/mlInferenceModel';

export class EnsembleEngine {
  /**
   * Get expiry-specific weight modifier profile
   */
  public static getExpiryWeightProfile(expiry: ExpiryDuration): {
    momentum: number;
    trend: number;
    meanReversion: number;
    priceAction: number;
    regime: number;
    ml: number;
  } {
    switch (expiry) {
      case '5s':
        return { momentum: 1.4, priceAction: 1.3, meanReversion: 0.9, trend: 0.6, regime: 0.8, ml: 1.0 };
      case '10s':
        return { momentum: 1.3, priceAction: 1.2, meanReversion: 0.9, trend: 0.8, regime: 0.8, ml: 1.0 };
      case '15s':
        return { momentum: 1.2, trend: 1.0, priceAction: 1.1, meanReversion: 0.9, regime: 0.9, ml: 0.9 };
      case '30s':
        return { momentum: 1.0, trend: 1.1, priceAction: 1.1, meanReversion: 1.0, regime: 0.9, ml: 0.9 };
      case '45s':
        return { trend: 1.2, momentum: 1.0, priceAction: 0.9, meanReversion: 0.9, regime: 1.0, ml: 1.0 };
      case '1m':
        return { trend: 1.3, ml: 1.2, momentum: 0.9, priceAction: 0.9, regime: 1.0, meanReversion: 0.7 };
      default:
        return { momentum: 1.0, trend: 1.0, meanReversion: 1.0, priceAction: 1.0, regime: 1.0, ml: 1.0 };
    }
  }

  /**
   * Run ensemble aggregation
   */
  public static aggregate(
    ind: IndicatorValues,
    currentPrice: number,
    expiry: ExpiryDuration,
    settings: UserSettings,
    mtf: MultiTimeframeSnapshot,
    trendScore: number,
    momentumScore: number,
    priceActionScore: number,
    volatilityScore: number,
    marketRegime: any,
    volatilityRegime: any
  ): {
    direction: SignalDirection;
    confidence: number;
    signalStrength: SignalStrength;
    modelVotes: ModelVotes;
    modelAgreement: ModelAgreement;
    technicalScores: TechnicalScores;
  } {
    const weightsConfig = settings.weights;
    const expiryProfile = this.getExpiryWeightProfile(expiry);

    // Run 6 modular models
    const voteA = MomentumModel.predict(ind, expiry);
    const voteB = TrendModel.predict(ind, currentPrice);
    const voteC = MeanReversionModel.predict(ind, currentPrice);
    const voteD = PriceActionModel.predict(ind);
    const voteE = RegimeModel.predict(ind, marketRegime, volatilityRegime);
    const voteF = MLInferenceModel.predict(ind, currentPrice, expiry);

    const modelVotes: ModelVotes = {
      momentumModel: { ...voteA, weight: weightsConfig.momentum * expiryProfile.momentum },
      trendModel: { ...voteB, weight: weightsConfig.trendAgreement * expiryProfile.trend },
      meanReversionModel: { ...voteC, weight: weightsConfig.technicalAgreement * 0.5 * expiryProfile.meanReversion },
      priceActionModel: { ...voteD, weight: weightsConfig.priceAction * expiryProfile.priceAction },
      regimeModel: { ...voteE, weight: weightsConfig.volatilityRegime * expiryProfile.regime },
      mlPredictionModel: { ...voteF, weight: weightsConfig.mlPrediction * expiryProfile.ml },
    };

    // Calculate model consensus agreement
    const votesList = [voteA.direction, voteB.direction, voteC.direction, voteD.direction, voteE.direction, voteF.direction];
    const bullishCount = votesList.filter(v => v === 'CALL').length;
    const bearishCount = votesList.filter(v => v === 'PUT').length;
    const neutralCount = votesList.filter(v => v === 'WAIT').length;

    const maxAgreement = Math.max(bullishCount, bearishCount);
    const agreementRatio = `${maxAgreement}/6`;
    const isConsensus = maxAgreement >= 3;

    const modelAgreement: ModelAgreement = {
      bullishCount,
      bearishCount,
      neutralCount,
      totalModels: 6,
      agreementRatio,
      isConsensus,
    };

    // Technical score synthesis
    const technicalAgreementScore = Math.round((maxAgreement / 6) * 100);

    const technicalScores: TechnicalScores = {
      technicalAgreementScore,
      trendScore: Math.round(trendScore),
      momentumScore: Math.round(momentumScore),
      priceActionScore: Math.round(priceActionScore),
      volatilityScore: Math.round(volatilityScore),
      mlPredictionScore: voteF.score,
    };

    // Weighted directional score (0 = strongly bearish, 50 = neutral, 100 = strongly bullish)
    let weightedScoreSum = 0;
    let totalWeight = 0;

    Object.values(modelVotes).forEach(mv => {
      totalWeight += mv.weight;
      weightedScoreSum += mv.weight * mv.score;
    });

    const normalizedEnsembleScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 50;

    // Multi-Timeframe alignment modifier
    let mtfBonus = 1.0;
    if (settings.requireMultiTimeframeConfirmation) {
      if (mtf.alignmentScore > 75) mtfBonus = 1.05;
      else if (mtf.alignmentScore < 40) mtfBonus = 0.92;
    }

    let direction: SignalDirection = 'WAIT';
    let calculatedConfidence = 50;

    if (normalizedEnsembleScore >= 52 && bullishCount >= bearishCount) {
      direction = 'CALL';
      // Map 52..80 score to 72%..94% confidence
      const delta = normalizedEnsembleScore - 50;
      calculatedConfidence = Math.min(94, Math.max(70, Math.round((68 + delta * 1.3) * mtfBonus)));
    } else if (normalizedEnsembleScore <= 48 && bearishCount >= bullishCount) {
      direction = 'PUT';
      // Map 48..20 score to 72%..94% confidence
      const delta = 50 - normalizedEnsembleScore;
      calculatedConfidence = Math.min(94, Math.max(70, Math.round((68 + delta * 1.3) * mtfBonus)));
    } else {
      direction = 'WAIT';
      calculatedConfidence = Math.round(50 + Math.abs(normalizedEnsembleScore - 50));
    }

    // Determine Signal Strength based on calculated confidence
    let signalStrength: SignalStrength = 'MODERATE';
    if (calculatedConfidence >= 85) signalStrength = 'VERY STRONG';
    else if (calculatedConfidence >= 78) signalStrength = 'STRONG';
    else if (calculatedConfidence >= 70) signalStrength = 'MODERATE';
    else if (calculatedConfidence >= 60) signalStrength = 'WEAK';
    else signalStrength = 'VERY WEAK';

    return {
      direction,
      confidence: calculatedConfidence,
      signalStrength,
      modelVotes,
      modelAgreement,
      technicalScores,
    };
  }
}
