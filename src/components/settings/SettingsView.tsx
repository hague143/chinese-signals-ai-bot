// src/components/settings/SettingsView.tsx

import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { audioService } from '../../services/audioService';
import { NotificationService } from '../../services/notificationService';
import { TelegramService } from '../../services/telegramService';
import {
  Sliders,
  Volume2,
  Bell,
  Send,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
} from 'lucide-react';
import { ExpiryDuration } from '../../types/market';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const [saveToast, setSaveToast] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleRequestNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    updateSettings({ browserNotificationsEnabled: granted });
    if (!granted) {
      alert('Notification permission was not granted by browser.');
    }
  };

  const handleTestTelegram = async () => {
    if (!settings.telegram.botToken || !settings.telegram.chatId) {
      setTelegramTestStatus('Please enter both Bot Token and Chat ID first');
      setTimeout(() => setTelegramTestStatus(null), 4000);
      return;
    }

    setTelegramTestStatus('Testing connection...');
    try {
      const url = `https://api.telegram.org/bot${settings.telegram.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegram.chatId,
          text: `🟢 <b>Chinese Signals AI Bot</b> — Telegram test message verified successfully!`,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTelegramTestStatus('Telegram connected successfully! ✓');
      } else {
        setTelegramTestStatus(`Failed: ${data.description}`);
      }
    } catch (e: any) {
      setTelegramTestStatus(`Error: ${e.message}`);
    }
    setTimeout(() => setTelegramTestStatus(null), 5000);
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Broker & Engine Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure Quotex OTC broker parameters, risk filters, cooldown intervals, audio cues, and Telegram webhook dispatchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Reset all user settings to default values?')) resetToDefaults();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-dark-800 text-slate-400 hover:text-white border border-dark-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveToast ? 'Saved ✓' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* 1. Broker & Data Feed Settings */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>1. Broker & Data Stream Settings</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Configured Broker</label>
            <input
              type="text"
              value="Quotex"
              disabled
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-slate-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Target Market</label>
            <input
              type="text"
              value="OTC Markets (Over The Counter)"
              disabled
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-slate-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Data Source Mode</label>
            <select
              value={settings.dataMode}
              onChange={e => updateSettings({ dataMode: e.target.value as any })}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="DEMO">Demo Market Simulator (Realistic Drift & Ticks)</option>
              <option value="LIVE_QUOTEX">Quotex Authorized Stream Adapter</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Default Expiry Timer</label>
            <select
              value={settings.defaultExpiry}
              onChange={e => updateSettings({ defaultExpiry: e.target.value as ExpiryDuration })}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="5s">5 Seconds</option>
              <option value="10s">10 Seconds</option>
              <option value="15s">15 Seconds</option>
              <option value="30s">30 Seconds</option>
              <option value="45s">45 Seconds</option>
              <option value="1m">1 Minute</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Signal Quality & Threshold Filters */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>2. Signal Quality & Confidence Gating</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Minimum Confidence Threshold</label>
              <span className="font-mono font-black text-cyan-300 text-sm">{settings.minConfidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={90}
              step={5}
              value={settings.minConfidenceThreshold}
              onChange={e => updateSettings({ minConfidenceThreshold: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>60% (More signals)</span>
              <span>75% (Recommended)</span>
              <span>90% (Strict)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Signal Cooldown Interval</label>
              <span className="font-mono font-black text-cyan-300 text-sm">{settings.signalCooldownSeconds}s</span>
            </div>
            <select
              value={settings.signalCooldownSeconds}
              onChange={e => updateSettings({ signalCooldownSeconds: Number(e.target.value) })}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>0 Seconds (No cooldown)</option>
              <option value={5}>5 Seconds</option>
              <option value={10}>10 Seconds (Recommended)</option>
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds</option>
              <option value={60}>60 Seconds</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer">
            <div>
              <div className="font-bold text-slate-200 text-xs">Require Multi-Timeframe Confirmation</div>
              <div className="text-[11px] text-slate-400">Moderates confidence if 1m, 5m, and 15m trend structures diverge.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.requireMultiTimeframeConfirmation}
              onChange={e => updateSettings({ requireMultiTimeframeConfirmation: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer">
            <div>
              <div className="font-bold text-slate-200 text-xs">Require AI Model Consensus</div>
              <div className="text-[11px] text-slate-400">Forces WAIT if fewer than 4 of 6 modular models agree on direction.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.requireModelConsensus}
              onChange={e => updateSettings({ requireModelConsensus: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer">
            <div>
              <div className="font-bold text-slate-200 text-xs">Auto-Resolve Trade Outcomes</div>
              <div className="text-[11px] text-slate-400">Automatically records WIN, LOSS, or DRAW when the signal countdown reaches zero.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoResolveSignals}
              onChange={e => updateSettings({ autoResolveSignals: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 3. Audio & Notifications */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span>3. Audio Cues & Sound Effects</span>
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-dark-950 border border-dark-800">
          <div>
            <div className="font-bold text-slate-200 text-xs">Enable Synthesized Audio Alerts</div>
            <div className="text-[11px] text-slate-400">Plays low-latency Web Audio API synthesized tones on signal generation & outcomes.</div>
          </div>
          <input
            type="checkbox"
            checked={settings.soundAlertsEnabled}
            onChange={e => updateSettings({ soundAlertsEnabled: e.target.checked })}
            className="w-4 h-4 accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Audio Test Triggers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Audition Cues:</span>
          <button
            onClick={() => audioService.playCallAlert()}
            className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 text-call border border-call/40 flex items-center gap-1 font-mono text-[11px]"
          >
            <Play className="w-3 h-3" /> CALL Chime
          </button>
          <button
            onClick={() => audioService.playPutAlert()}
            className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 text-put border border-put/40 flex items-center gap-1 font-mono text-[11px]"
          >
            <Play className="w-3 h-3" /> PUT Drop
          </button>
          <button
            onClick={() => audioService.playWaitAlert()}
            className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 text-wait border border-wait/40 flex items-center gap-1 font-mono text-[11px]"
          >
            <Play className="w-3 h-3" /> WAIT Soft
          </button>
          <button
            onClick={() => audioService.playWinFanfare()}
            className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-mono text-[11px]"
          >
            <Play className="w-3 h-3" /> WIN Fanfare
          </button>
        </div>
      </div>

      {/* 4. Telegram Bot Integration */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            <span>4. Telegram Integration (Section 32)</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Optional Webhook</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Telegram Bot Token</label>
            <input
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              value={settings.telegram.botToken}
              onChange={e => updateSettings({ telegram: { ...settings.telegram, botToken: e.target.value } })}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Target Chat / Channel ID</label>
            <input
              type="text"
              placeholder="@my_signals_channel or -10012345678"
              value={settings.telegram.chatId}
              onChange={e => updateSettings({ telegram: { ...settings.telegram, chatId: e.target.value } })}
              className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={settings.telegram.sendOnSignal}
              onChange={e => updateSettings({ telegram: { ...settings.telegram, sendOnSignal: e.target.checked } })}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Automatically dispatch on every high-confidence signal</span>
          </label>

          <button
            onClick={handleTestTelegram}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {telegramTestStatus || 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  );
};
