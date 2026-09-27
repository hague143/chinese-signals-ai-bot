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

export interface MasterSignalOutput {
  id: string;
  symbol: string;
  broker: 'Quotex';
  marketType: 'OTC';
  direction: SignalDirection;
  confidence: number;                 // 0 to 100
  signalStrength: SignalStrength;
  expiry: ExpiryDuration;
  expirySeconds: number;
  entryPrice: number;
  exitPrice?: number;
  result: SignalOutcome;
  timestamp: number;                  // epoch ms
  expiresAt: number;                  // epoch ms
  
  trend: TrendDirection;
  momentum: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  volatilityRegime: VolatilityRegime;
  marketRegime: MarketRegimeType;
  modelAgreement: ModelAgreement;
  modelVotes: ModelVotes;
  technicalScores: TechnicalScores;
  
  analysisReasons: string[];
  explanationText: string;
  riskStatus: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  
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
