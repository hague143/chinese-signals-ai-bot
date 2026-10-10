// src/components/admin/AdminKeyManagementView.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  ShieldAlert,
  PlusCircle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  RotateCcw,
  Clock,
  Ban,
  CalendarPlus,
  Search,
  Lock,
  Cpu,
  Monitor,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LicenseRecord } from '../../server/db';

export const AdminKeyManagementView: React.FC = () => {
  const { adminPassword, setAdminPassword } = useAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!adminPassword);

  const [keys, setKeys] = useState<LicenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Key generator state
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [noteInput, setNoteInput] = useState('');
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState<LicenseRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter / Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'unused' | 'expired' | 'revoked'>('ALL');

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const fetchKeys = useCallback(async (pwd?: string) => {
    const passwordToUse = pwd || adminPassword;
    if (!passwordToUse) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/keys', {
        headers: {
          'x-admin-password': passwordToUse,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsAuthenticated(false);
        setAdminPassword(null);
        showNotification(data.error || 'Invalid Admin Password', true);
        return;
      }

      setKeys(data.keys || []);
      setIsAuthenticated(true);
    } catch {
      showNotification('Network error loading admin keys', true);
    } finally {
      setIsLoading(false);
    }
  }, [adminPassword, setAdminPassword]);

  useEffect(() => {
    if (adminPassword) {
      fetchKeys(adminPassword);
    }
  }, [adminPassword, fetchKeys]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setAdminPassword(passwordInput.trim());
    await fetchKeys(passwordInput.trim());
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({
          durationDays: selectedDuration,
          note: noteInput.trim() || undefined,
          customKey: customKeyInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification(data.error || 'Failed to generate key', true);
        return;
      }

      setGeneratedKey(data.key);
      setNoteInput('');
      setCustomKeyInput('');
      showNotification(`License key generated successfully!`);
      await fetchKeys();
    } catch {
      showNotification('Failed to generate license key', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (key: string, action: 'revoke' | 'extend' | 'reset_device', extendDays = 30) => {
    if (!adminPassword) return;

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ key, action, extendDays }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification(data.error || 'Action failed', true);
        return;
      }

      showNotification(data.message || `Action ${action} successful`);
      await fetchKeys();
    } catch {
      showNotification(`Failed to perform ${action}`, true);
    }
  };

  const handleDelete = async (key: string) => {
    if (!adminPassword) return;
    if (!window.confirm(`Permanently delete license key ${key}?`)) return;

    try {
      const res = await fetch(`/api/admin/keys?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification(data.error || 'Delete failed', true);
        return;
      }

      showNotification(`Key ${key} deleted`);
      await fetchKeys();
    } catch {
      showNotification('Failed to delete key', true);
    }
  };

  const copyToClipboard = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredKeys = keys.filter(k => {
    if (statusFilter !== 'ALL' && k.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        k.key.toLowerCase().includes(term) ||
        (k.note && k.note.toLowerCase().includes(term)) ||
        (k.device_id && k.device_id.toLowerCase().includes(term)) ||
        (k.last_ip && k.last_ip.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Password Lock Screen if not authorized
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-dark-900 border border-dark-750 shadow-2xl my-12 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-dark-850 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-black text-white">Administrator Portal</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Enter the master ADMIN_PASSWORD to manage license keys & device bindings.
        </p>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Enter ADMIN_PASSWORD..."
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="w-full bg-dark-950 border border-dark-700 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-center font-mono text-sm focus:outline-none"
            autoFocus
          />

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-mono shadow-glow-amber transition-all"
          >
            Authenticate Admin Access
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-white">License Management Control Center</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate, revoke, extend, and reset hardware-locked license keys. Fully synced with Supabase PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchKeys()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setAdminPassword(null);
              setIsAuthenticated(false);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors"
          >
            Lock Admin
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Generate New License Key */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-750 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Generate New License Key</h3>
        </div>

        <form onSubmit={handleGenerateKey} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Duration Selector */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select Duration
              </label>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-bold">
                {[
                  { days: 1, label: '1 Day' },
                  { days: 7, label: '7 Days' },
                  { days: 30, label: '30 Days' },
                  { days: -1, label: 'Lifetime' },
                ].map(opt => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelectedDuration(opt.days)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      selectedDuration === opt.days
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-glow-cyan'
                        : 'bg-dark-950 text-slate-400 border-dark-750 hover:bg-dark-850'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note & Custom Key (Optional) */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Customer Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. VIP Telegram @user123"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                className="w-full bg-dark-950 border border-dark-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Generate Button */}
            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-glow-call transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>GENERATE KEY</span>
              </button>
            </div>
          </div>
        </form>

        {/* Newly Generated Key Popup / Banner */}
        {generatedKey && (
          <div className="mt-4 p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-900/60 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-cyan-300" />
              </span>
              <div>
                <div className="text-[10px] text-cyan-300 uppercase font-bold">New License Key Created</div>
                <div className="font-mono font-black text-lg text-white tracking-widest">{generatedKey.key}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(generatedKey.key)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
              >
                {copiedKey === generatedKey.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === generatedKey.key ? 'COPIED!' : 'COPY KEY'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Manage Existing License Keys Table */}
      <div className="rounded-2xl bg-dark-900 border border-dark-750 shadow-card overflow-hidden">
        {/* Filters & Search Toolbar */}
        <div className="p-4 bg-dark-950/60 border-b border-dark-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Status:</span>
            {(['ALL', 'active', 'unused', 'expired', 'revoked'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-dark-750 text-cyan-300 border border-cyan-700/60'
                    : 'bg-dark-950 text-slate-400 hover:bg-dark-850'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search key, note, device..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-dark-950 border border-dark-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>
        </div>

        {/* Keys Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-950/70 text-[10px] uppercase font-bold text-slate-400 font-mono">
                <th className="py-3 px-4">LICENSE KEY</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">DURATION / EXPIRY</th>
                <th className="py-3 px-3">BOUND DEVICE</th>
                <th className="py-3 px-3">LAST IP</th>
                <th className="py-3 px-3">LAST USED</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60 font-mono">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No license keys found matching query.
                  </td>
                </tr>
              ) : (
                filteredKeys.map(k => {
                  const isActive = k.status === 'active';
                  const isUnused = k.status === 'unused';
                  const isExpired = k.status === 'expired';
                  const isRevoked = k.status === 'revoked';

                  const expiryStr = k.expires_at
                    ? new Date(k.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : k.duration_days === -1 ? 'Lifetime Access' : `${k.duration_days} Days (On First Use)`;

                  const lastUsedStr = k.last_used_at
                    ? new Date(k.last_used_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Never';

                  return (
                    <tr key={k.id} className="hover:bg-dark-850/50 transition-colors">
                      {/* Key */}
                      <td className="py-3 px-4 font-bold text-white font-mono flex items-center gap-2">
                        <span className="tracking-wider">{k.key}</span>
                        <button
                          onClick={() => copyToClipboard(k.key)}
                          className="p-1 rounded hover:bg-dark-800 text-slate-400 hover:text-white"
                          title="Copy key"
                        >
                          {copiedKey === k.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {k.note && (
                          <span className="text-[10px] text-slate-500 font-sans truncate max-w-[120px]">
                            ({k.note})
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase border ${
                          isActive
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                            : isUnused
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
                            : isExpired
                            ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                            : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                        }`}>
                          {k.status}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="py-3 px-3 text-slate-300 text-xs">
                        {expiryStr}
                      </td>

                      {/* Bound Device */}
                      <td className="py-3 px-3">
                        {k.device_id ? (
                          <div className="flex items-center gap-1.5 text-slate-300" title={k.device_id}>
                            <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[110px] text-[11px]">{k.device_id}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Unbound</span>
                        )}
                      </td>

                      {/* Last IP */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {k.last_ip ? (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-500" />
                            {k.last_ip}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Last Used */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {lastUsedStr}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Extend Button */}
                          <button
                            onClick={() => handleAction(k.key, 'extend', 30)}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-dark-700 hover:border-cyan-700 transition-colors"
                            title="Extend +30 Days"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Device Button */}
                          <button
                            onClick={() => handleAction(k.key, 'reset_device')}
                            disabled={!k.device_id}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-amber-950 text-slate-300 hover:text-amber-300 border border-dark-700 hover:border-amber-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Reset Hardware Device Binding"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke Button */}
                          <button
                            onClick={() => handleAction(k.key, 'revoke')}
                            disabled={isRevoked}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-dark-700 hover:border-rose-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Revoke License"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(k.key)}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-900 text-slate-400 hover:text-rose-400 border border-dark-700 transition-colors"
                            title="Delete License"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
