// src/types/settings.ts

import { ExpiryDuration } from './market';

export interface UserSettings {
  broker: 'Quotex';
  market: 'OTC';
  dataMode: 'DEMO' | 'LIVE_QUOTEX';
  defaultExpiry: ExpiryDuration;
  minConfidenceThreshold: number; // e.g. 75 (%)
  signalCooldownSeconds: number;   // e.g. 10 (s)
  requireMultiTimeframeConfirmation: boolean;
  requireModelConsensus: boolean;
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  autoResolveSignals: boolean; // automatically check outcome after countdown
  
  // Weights (must sum to 100)
  weights: {
    technicalAgreement: number; // default 20
    trendAgreement: number;     // default 15
    momentum: number;           // default 20
    priceAction: number;        // default 15
    volatilityRegime: number;   // default 10
    mlPrediction: number;       // default 20
  };

  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    sendOnSignal: boolean;
    minConfidenceToSend: number;
  };
}

export interface AdminConfig {
  maintenanceMode: boolean;
  maxSignalGenerationPerMinute: number;
  allowManualSignalResolution: boolean;
  systemHealthStatus: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  dataFeedLatencyMs: number;
  dataHealthScore: number;
}
