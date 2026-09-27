// src/types/models.ts

import { SignalDirection } from './signal';

export interface AIModelMeta {
  id: string;
  name: string;
  codeName: string;
  type: 'Momentum' | 'Trend' | 'Mean-Reversion' | 'Price-Action' | 'Regime' | 'Machine Learning';
  description: string;
  currentWeight: number; // percentage in ensemble
  historicalAccuracy: number; // e.g. 71.4%
  precision: number;
  recall: number;
  totalEvaluated: number;
  status: 'ACTIVE' | 'TRAINING' | 'CALIBRATING';
  inputs: string[];
  lastInferenceMs: number;
}

export interface ModelPerformanceSnapshot {
  modelId: string;
  modelName: string;
  winCount: number;
  lossCount: number;
  accuracy: number;
  currentVote: SignalDirection;
  confidenceContribution: number;
}
