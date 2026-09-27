// src/engine/models/mlInferenceModel.ts

import { IndicatorValues } from '../../types/indicators';
import { ExpiryDuration } from '../../types/market';
import { SignalDirection } from '../../types/signal';

export interface MLFeatureVector {
  norm_rsi: number;          // RSI / 100 (0 to 1)
  norm_macd_hist: number;     // Normalized MACD Histogram (-1 to 1)
  norm_ema_diff: number;      // (EMA9 - EMA21) / Price
  norm_bb_pct_b: number;      // %B position (0 to 1)
  norm_adx: number;           // ADX / 100 (0 to 1)
  norm_momentum1: number;     // 1-bar ROC
  norm_momentum3: number;     // 3-bar ROC
  norm_body_ratio: number;    // Body / (Range + eps)
  norm_wick_bias: number;     // (LowerWick - UpperWick) / (Range + eps)
  expiry_sec: number;
}

export class MLInferenceModel {
  public static readonly name = 'ML Predictor Model';
  public static readonly code = 'MODEL_F_ML_ENSEMBLE';

  private static remoteInferenceUrl: string | null = null;

  public static setRemoteUrl(url: string | null) {
    this.remoteInferenceUrl = url;
  }

  public static extractFeatureVector(
    ind: IndicatorValues,
    currentPrice: number,
    expiry: ExpiryDuration
  ): MLFeatureVector {
    const range = Math.max(ind.upperWick + ind.lowerWick + ind.bodySize, 0.00001);
    
    return {
      norm_rsi: ind.rsi14 / 100,
      norm_macd_hist: Math.max(-1, Math.min(1, ind.macdHistogram / (ind.atr14 || 0.001))),
      norm_ema_diff: (ind.ema9 - ind.ema21) / (currentPrice || 1),
      norm_bb_pct_b: ind.bbPctB,
      norm_adx: ind.adx14 / 100,
      norm_momentum1: ind.momentum1,
      norm_momentum3: ind.momentum3,
      norm_body_ratio: ind.bodySize / range,
      norm_wick_bias: (ind.lowerWick - ind.upperWick) / range,
      expiry_sec: expiry === '5s' ? 5 : expiry === '10s' ? 10 : expiry === '15s' ? 15 : expiry === '30s' ? 30 : expiry === '45s' ? 45 : 60,
    };
  }

  public static predict(
    ind: IndicatorValues,
    currentPrice: number,
    expiry: ExpiryDuration
  ): { direction: SignalDirection; score: number; probability: number; reason: string } {
    const fv = this.extractFeatureVector(ind, currentPrice, expiry);

    // Calibrated logistic regression weights
    const w_rsi = 2.8 * (fv.norm_rsi - 0.5);
    const w_macd = 2.0 * fv.norm_macd_hist;
    const w_ema = 3.5 * Math.sign(fv.norm_ema_diff) * Math.min(Math.abs(fv.norm_ema_diff * 1000), 1);
    const w_mom = 2.4 * Math.max(-1, Math.min(1, fv.norm_momentum1 * 10));
    const w_wick = 1.6 * fv.norm_wick_bias;
    const w_bb = 1.4 * (fv.norm_bb_pct_b - 0.5);

    const logit = w_rsi + w_macd + w_ema + w_mom + w_wick + w_bb;
    const probability = 1 / (1 + Math.exp(-logit));
    const score = Math.max(5, Math.min(95, Math.round(probability * 100)));

    let direction: SignalDirection = 'WAIT';
    let reason = 'ML feature probability within balanced range';

    if (score >= 54) {
      direction = 'CALL';
      reason = `ML multi-feature classifier indicates ${(probability * 100).toFixed(1)}% upward probability`;
    } else if (score <= 46) {
      direction = 'PUT';
      reason = `ML multi-feature classifier indicates ${((1 - probability) * 100).toFixed(1)}% downward probability`;
    }

    return { direction, score, probability, reason };
  }
}
