// src/components/admin/AdminPanelView.tsx

import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useMarket } from '../../context/MarketContext';
import { OTCPair } from '../../types/market';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Activity,
  Sliders,
  Server,
  AlertTriangle,
  Zap,
  Save,
  RefreshCw,
} from 'lucide-react';

export const AdminPanelView: React.FC = () => {
  const { settings, updateWeights, adminConfig, updateAdminConfig, pairs, addPair, updatePair, togglePairActive, deletePair } = useSettings();
  const { marketStatus } = useMarket();

  // Dynamic Pair Modal / Form State
  const [showAddPairModal, setShowAddPairModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newBase, setNewBase] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newPayout, setNewPayout] = useState(88);
  const [newCategory, setNewCategory] = useState<'Currencies' | 'Crypto' | 'Commodities' | 'Indices'>('Currencies');
  const [newPrice, setNewPrice] = useState(1.0850);
  const [newDecimals, setNewDecimals] = useState(5);

  const [weightSaveStatus, setWeightSaveStatus] = useState(false);

  const totalWeights = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  const handleAddPairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || !newBase || !newQuote) {
      alert('Please fill out all required fields');
      return;
    }

    const pairObj: OTCPair = {
      id: `otc-${newSymbol.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
      symbol: newSymbol.includes('OTC') ? newSymbol : `${newSymbol} OTC`,
      displayName: newSymbol.includes('OTC') ? newSymbol : `${newSymbol} OTC`,
      baseAsset: newBase.toUpperCase(),
      quoteAsset: newQuote.toUpperCase(),
      broker: 'Quotex',
      marketType: 'OTC',
      isActive: true,
      payoutRate: Number(newPayout),
      lastPrice: Number(newPrice),
      change24h: 0.15,
      high24h: Number((newPrice * 1.004).toFixed(newDecimals)),
      low24h: Number((newPrice * 0.996).toFixed(newDecimals)),
      decimals: Number(newDecimals),
      category: newCategory,
      lastUpdated: Date.now(),
    };

    addPair(pairObj);
    setShowAddPairModal(false);
    setNewSymbol('');
    setNewBase('');
    setNewQuote('');
    alert(`OTC Instrument ${pairObj.symbol} successfully registered!`);
  };

  const handleSaveWeights = () => {
    setWeightSaveStatus(true);
    setTimeout(() => setWeightSaveStatus(false), 2000);
  };

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-wrap items-center justify-between gap-4 shadow-card">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span>Admin Quantitative Control Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            System health telemetry, dynamic OTC pair database registry, and ensemble indicator weight calibrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>System Status: HEALTHY</span>
          </div>
        </div>
      </div>

      {/* Dynamic OTC Pair Registry (Section 2 & 24) */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base">Dynamic OTC Pair Database Registry</h3>
            <p className="text-xs text-slate-400">
              Register new Quotex OTC symbols dynamically without frontend redeployment.
            </p>
          </div>

          <button
            onClick={() => setShowAddPairModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-glow-cyan transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New OTC Pair</span>
          </button>
        </div>

        {/* Pairs Table */}
        <div className="overflow-x-auto rounded-xl border border-dark-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-dark-950 text-[10px] uppercase text-slate-400 border-b border-dark-800">
              <tr>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Base/Quote</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Payout %</th>
                <th className="py-2.5 px-3">Last Price</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60">
              {pairs.map(p => (
                <tr key={p.id} className="hover:bg-dark-850/50">
                  <td className="py-2.5 px-3 font-bold text-white font-sans">{p.symbol}</td>
                  <td className="py-2.5 px-3 text-slate-400">{p.baseAsset} / {p.quoteAsset}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-dark-950 border border-dark-800 text-[10px] text-slate-300">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{p.payoutRate}%</td>
                  <td className="py-2.5 px-3 text-slate-300">{p.lastPrice.toFixed(p.decimals)}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => togglePairActive(p.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.isActive
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                      }`}
                    >
                      {p.isActive ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${p.symbol} from active OTC registry?`)) deletePair(p.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Weight Tuning Matrix (Section 6 & 24) */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Ensemble Model & Feature Weights Calibration</h3>
            <p className="text-xs text-slate-400">
              Tune mathematical feature weighting in the confidence aggregation equation (Sum must equal 100%).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`font-mono text-xs font-bold ${totalWeights === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Total: {totalWeights}% {totalWeights === 100 ? '✓' : '(Must equal 100%)'}
            </span>
            <button
              onClick={handleSaveWeights}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 flex items-center gap-1.5 shadow-glow-cyan"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{weightSaveStatus ? 'Saved ✓' : 'Apply Weights'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>Technical Agreement</span>
              <span className="font-mono text-cyan-400">{settings.weights.technicalAgreement}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.technicalAgreement}
              onChange={e => updateWeights({ technicalAgreement: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>Trend Agreement</span>
              <span className="font-mono text-cyan-400">{settings.weights.trendAgreement}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.trendAgreement}
              onChange={e => updateWeights({ trendAgreement: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>Momentum Flow</span>
              <span className="font-mono text-cyan-400">{settings.weights.momentum}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.momentum}
              onChange={e => updateWeights({ momentum: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>Price Action Structure</span>
              <span className="font-mono text-cyan-400">{settings.weights.priceAction}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.priceAction}
              onChange={e => updateWeights({ priceAction: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>Volatility / Regime</span>
              <span className="font-mono text-cyan-400">{settings.weights.volatilityRegime}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.volatilityRegime}
              onChange={e => updateWeights({ volatilityRegime: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
            <div className="flex justify-between font-bold text-slate-300 mb-1.5">
              <span>AI / ML Inference</span>
              <span className="font-mono text-cyan-400">{settings.weights.mlPrediction}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={settings.weights.mlPrediction}
              onChange={e => updateWeights({ mlPrediction: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Telemetry & Health Monitor */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
        <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>System Telemetry & Stream Latency</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Stream Latency</div>
            <div className="text-base font-bold text-emerald-400 mt-1">{marketStatus.latencyMs} ms</div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Feed Health Score</div>
            <div className="text-base font-bold text-cyan-300 mt-1">{adminConfig.dataHealthScore}%</div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Active Instruments</div>
            <div className="text-base font-bold text-purple-300 mt-1">{pairs.filter(p => p.isActive).length} Pairs</div>
          </div>

          <div className="p-3 rounded-xl bg-dark-950 border border-dark-800">
            <div className="text-[10px] text-slate-500 uppercase">Engine Architecture</div>
            <div className="text-base font-bold text-amber-300 mt-1">Quotex OTC v4.2</div>
          </div>
        </div>
      </div>

      {/* Add OTC Pair Modal */}
      {showAddPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddPairSubmit}
            className="bg-dark-900 border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Register New OTC Symbol
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPairModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Symbol Name</label>
                <input
                  type="text"
                  placeholder="e.g. AUD/CAD OTC or SOL/USD OTC"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Base Asset</label>
                  <input
                    type="text"
                    placeholder="e.g. AUD"
                    value={newBase}
                    onChange={e => setNewBase(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Quote Asset</label>
                  <input
                    type="text"
                    placeholder="e.g. CAD"
                    value={newQuote}
                    onChange={e => setNewQuote(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Payout %</label>
                  <input
                    type="number"
                    min={50}
                    max={98}
                    value={newPayout}
                    onChange={e => setNewPayout(Number(e.target.value))}
                    className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Decimals</label>
                  <select
                    value={newDecimals}
                    onChange={e => setNewDecimals(Number(e.target.value))}
                    className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value={5}>5 (Forex)</option>
                    <option value={3}>3 (JPY)</option>
                    <option value={2}>2 (Crypto/Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Currencies">Currencies</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Commodities">Commodities</option>
                    <option value="Indices">Indices</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Initial Base Price</label>
                <input
                  type="number"
                  step="any"
                  value={newPrice}
                  onChange={e => setNewPrice(Number(e.target.value))}
                  className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-dark-800">
              <button
                type="button"
                onClick={() => setShowAddPairModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-dark-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-glow-cyan"
              >
                Register Pair
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
