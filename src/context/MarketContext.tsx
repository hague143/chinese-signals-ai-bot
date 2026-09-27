// src/context/MarketContext.tsx

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { OTCPair, Candle, Tick, MarketStatus, ExpiryDuration, Timeframe } from '../types/market';
import { MarketDataProvider } from '../providers/marketDataProvider';
import { DemoProvider } from '../providers/demoProvider';
import { QuotexProvider } from '../providers/quotexProvider';
import { useSettings } from './SettingsContext';

interface MarketContextType {
  selectedPair: OTCPair;
  setSelectedPair: (pair: OTCPair) => void;
  selectedExpiry: ExpiryDuration;
  setSelectedExpiry: (expiry: ExpiryDuration) => void;
  selectedTimeframe: Timeframe;
  setSelectedTimeframe: (tf: Timeframe) => void;
  currentPrice: number;
  lastTick: Tick | null;
  candles: Candle[];
  candles5m: Candle[];
  candles15m: Candle[];
  isLoadingCandles: boolean;
  marketStatus: MarketStatus;
  provider: MarketDataProvider;
  refreshCandles: () => Promise<void>;
  getAllPairPrices: () => Record<string, number>;
}

const MarketContext = createContext<MarketContextType | null>(null);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, pairs } = useSettings();

  const [selectedPair, setSelectedPair] = useState<OTCPair>(() => pairs[0] || {
    id: 'otc-eurusd',
    symbol: 'EUR/USD OTC',
    displayName: 'EUR/USD OTC',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    broker: 'Quotex',
    marketType: 'OTC',
    isActive: true,
    payoutRate: 89,
    lastPrice: 1.08452,
    change24h: 0.38,
    high24h: 1.08920,
    low24h: 1.07980,
    decimals: 5,
    category: 'Currencies',
    lastUpdated: Date.now(),
  });

  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryDuration>(settings.defaultExpiry || '30s');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1m');
  const [currentPrice, setCurrentPrice] = useState<number>(selectedPair.lastPrice);
  const [lastTick, setLastTick] = useState<Tick | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candles5m, setCandles5m] = useState<Candle[]>([]);
  const [candles15m, setCandles15m] = useState<Candle[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [pairPrices, setPairPrices] = useState<Record<string, number>>({});

  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    broker: 'Quotex',
    market: 'OTC Markets',
    isConnected: true,
    isDemo: settings.dataMode === 'DEMO',
    dataQuality: 'OPTIMAL',
    latencyMs: 18,
    lastHeartbeat: Date.now(),
    activePairsCount: pairs.filter(p => p.isActive).length,
  });

  // Data provider instance
  const provider = useMemo<MarketDataProvider>(() => {
    return settings.dataMode === 'LIVE_QUOTEX' ? new QuotexProvider() : new DemoProvider();
  }, [settings.dataMode]);

  // Load historical candles
  const loadCandles = useCallback(async () => {
    setIsLoadingCandles(true);
    try {
      const [cMain, c5m, c15m] = await Promise.all([
        provider.getCandles(selectedPair.symbol, selectedTimeframe, 80),
        provider.getCandles(selectedPair.symbol, '5m', 40),
        provider.getCandles(selectedPair.symbol, '15m', 30),
      ]);
      setCandles(cMain);
      setCandles5m(c5m);
      setCandles15m(c15m);
      if (cMain.length > 0) {
        setCurrentPrice(cMain[cMain.length - 1].close);
      }
    } catch (e) {
      console.error('Failed to load candles', e);
    } finally {
      setIsLoadingCandles(false);
    }
  }, [provider, selectedPair.symbol, selectedTimeframe]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // Subscribe to live price stream for active pair
  useEffect(() => {
    const unsubscribe = provider.subscribeToPrice(selectedPair.symbol, (price, tick) => {
      setCurrentPrice(price);
      setLastTick(tick);
      setPairPrices(prev => ({ ...prev, [selectedPair.symbol]: price }));

      // Update current in-progress candle in real-time
      setCandles(prevCandles => {
        if (!prevCandles || prevCandles.length === 0) return prevCandles;
        const last = { ...prevCandles[prevCandles.length - 1] };
        last.close = price;
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.volume += tick.volume;
        return [...prevCandles.slice(0, -1), last];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [provider, selectedPair.symbol]);

  // Subscribe to all pairs background price sync
  useEffect(() => {
    const unsubs = pairs.map(p =>
      provider.subscribeToPrice(p.symbol, (price) => {
        setPairPrices(prev => ({ ...prev, [p.symbol]: price }));
      })
    );

    return () => {
      unsubs.forEach(u => u());
    };
  }, [provider, pairs]);

  // Market status heartbeat
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await provider.getMarketStatus();
      setMarketStatus(status);
    }, 4000);
    return () => clearInterval(interval);
  }, [provider]);

  const getAllPairPrices = () => pairPrices;

  return (
    <MarketContext.Provider
      value={{
        selectedPair,
        setSelectedPair,
        selectedExpiry,
        setSelectedExpiry,
        selectedTimeframe,
        setSelectedTimeframe,
        currentPrice,
        lastTick,
        candles,
        candles5m,
        candles15m,
        isLoadingCandles,
        marketStatus,
        provider,
        refreshCandles: loadCandles,
        getAllPairPrices,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
