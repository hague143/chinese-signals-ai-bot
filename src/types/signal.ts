// src/types/signal.ts

import { ExpiryDuration } from './market';
import { TrendDirection, VolatilityRegime, MarketRegimeType } from './indicators';

export type SignalDirection = 'CALL' | 'PUT' | 'WAIT';

export type SignalStrength = 'VERY WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY STRONG';

export type SignalOutcome = 'WIN' | 'LOSS' | 'DRAW' | 'UNRESOLVED' | 'CANCELLED';

export interface ModelVotes {
  momentumModel: { direction: SignalDirection; score: number; weight: number; reason: string };
  trendModel: { direction: SignalDirection; score: number; weight: number; reason: string };
  meanReversionModel: { direction: SignalDirection; score: number; weight: number; reason: string };
  priceActionModel: { direction: SignalDirection; score: number; weight: number; reason: string };
  regimeModel: { direction: SignalDirection; score: number; weight: number; reason: string };
  mlPredictionModel: { direction: SignalDirection; score: number; weight: number; reason: string };
}

export interface ModelAgreement {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalModels: number;
  agreementRatio: string; // e.g. "5/6"
  isConsensus: boolean;
}

export interface TechnicalScores {
  technicalAgreementScore: number; // 0-100
  trendScore: number;               // 0-100
  momentumScore: number;            // 0-100
  priceActionScore: number;         // 0-100
  volatilityScore: number;          // 0-100
  mlPredictionScore: number;        // 0-100
}

export interface IndicatorsSummary {
  rsi: number;
  ema9: number;
  ema21: number;
  ema50: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  adx: number;
  atr: number;
  cci: number;
  support: number;
  resistance: number;
}

export interface MasterSignalOutput {
  id: string;
  cacheKey: string;
  symbol: string;
  pair?: string;
  broker: 'Quotex';
  marketType: 'OTC';
  direction: SignalDirection;
  signal?: SignalDirection;
  confidence: number;                 // 0 to 100
  bullishScore: number;
  bearishScore: number;
  signalStrength: SignalStrength;
  expiry: ExpiryDuration;
  expirySeconds: number;
  timeframe: string;
  entryPrice: number;
  exitPrice?: number;
  result: SignalOutcome;
  timestamp: number;                  // generation epoch ms
  candleTimestamp: number;            // evaluated candle epoch ms
  dataTimestamp: number;              // market data arrival epoch ms
  dataSource: string;                 // e.g. 'Quotex OTC Demo Simulator' | 'Quotex Official OTC Stream'
  signalMode: 'CLOSED_CANDLE' | 'LIVE_CANDLE';
  expiresAt: number;                  // epoch ms
  
  trend: TrendDirection;
  momentum: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  volatilityRegime: VolatilityRegime;
  marketRegime: MarketRegimeType;
  modelAgreement: ModelAgreement;
  modelVotes: ModelVotes;
  technicalScores: TechnicalScores;
  indicatorsSummary: IndicatorsSummary;
  
  reasons: string[];
  analysisReasons: string[];
  explanationText: string;
  riskStatus: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  
  isValid: boolean;
  validationReason?: string;

  dataQuality: {
    isFresh: boolean;
    qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'STALE';
    score: number;
  };

  multiTimeframe: {
    tf1m: string;
    tf5m: string;
    tf15m: string;
    alignment: string;
  };
  
  isUpdated?: boolean; // For duplicate/cooldown transition
}
