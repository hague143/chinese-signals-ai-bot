// src/context/SettingsContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSettings, AdminConfig } from '../types/settings';
import { OTCPair, ExpiryDuration } from '../types/market';
import { StorageService, DEFAULT_USER_SETTINGS, DEFAULT_ADMIN_CONFIG } from '../services/storageService';
import { audioService } from '../services/audioService';

interface SettingsContextType {
  settings: UserSettings;
  adminConfig: AdminConfig;
  pairs: OTCPair[];
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateWeights: (newWeights: Partial<UserSettings['weights']>) => void;
  updateAdminConfig: (newConfig: Partial<AdminConfig>) => void;
  updatePair: (pair: OTCPair) => void;
  addPair: (pair: OTCPair) => void;
  togglePairActive: (pairId: string) => void;
  deletePair: (pairId: string) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getUserSettings());
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(() => StorageService.getAdminConfig());
  const [pairs, setPairs] = useState<OTCPair[]>(() => StorageService.getOTCPairs());

  useEffect(() => {
    audioService.setEnabled(settings.soundAlertsEnabled);
  }, [settings.soundAlertsEnabled]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      StorageService.saveUserSettings(updated);
      return updated;
    });
  };

  const updateWeights = (newWeights: Partial<UserSettings['weights']>) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        weights: { ...prev.weights, ...newWeights }
      };
      StorageService.saveUserSettings(updated);
      return updated;
    });
  };

  const updateAdminConfig = (newConfig: Partial<AdminConfig>) => {
    setAdminConfig(prev => {
      const updated = { ...prev, ...newConfig };
      StorageService.saveAdminConfig(updated);
      return updated;
    });
  };

  const updatePair = (pair: OTCPair) => {
    setPairs(prev => {
      const updated = prev.map(p => (p.id === pair.id ? pair : p));
      StorageService.saveOTCPairs(updated);
      return updated;
    });
  };

  const addPair = (pair: OTCPair) => {
    setPairs(prev => {
      const existing = prev.find(p => p.symbol.toLowerCase() === pair.symbol.toLowerCase());
      let updated: OTCPair[];
      if (existing) {
        updated = prev.map(p => (p.symbol.toLowerCase() === pair.symbol.toLowerCase() ? pair : p));
      } else {
        updated = [...prev, pair];
      }
      StorageService.saveOTCPairs(updated);
      return updated;
    });
  };

  const togglePairActive = (pairId: string) => {
    setPairs(prev => {
      const updated = prev.map(p => (p.id === pairId ? { ...p, isActive: !p.isActive } : p));
      StorageService.saveOTCPairs(updated);
      return updated;
    });
  };

  const deletePair = (pairId: string) => {
    setPairs(prev => {
      const updated = prev.filter(p => p.id !== pairId);
      StorageService.saveOTCPairs(updated);
      return updated;
    });
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_USER_SETTINGS);
    setAdminConfig(DEFAULT_ADMIN_CONFIG);
    StorageService.saveUserSettings(DEFAULT_USER_SETTINGS);
    StorageService.saveAdminConfig(DEFAULT_ADMIN_CONFIG);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        adminConfig,
        pairs,
        updateSettings,
        updateWeights,
        updateAdminConfig,
        updatePair,
        addPair,
        togglePairActive,
        deletePair,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
