import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Trash2,
  Key,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  Filter,
  Save,
  RefreshCw,
  FileText,
  Clock,
  Cpu
} from 'lucide-react';
import { SystemSettings, AuditLogEntry, User } from '../types';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'model' | 'privacy' | 'audit'>('users');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedProvider, setSelectedProvider] = useState('LOCAL_GROUNDED');
  const [privacyMode, setPrivacyMode] = useState('STANDARD_SECURE');
  const [retentionDays, setRetentionDays] = useState(30);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Purge states
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Audit search
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [sData, aData, uData] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs({ limit: 100 }),
        api.getUsers().catch(() => [])
      ]);
      setSettings(sData);
      setSelectedProvider(sData.llm_provider);
      setPrivacyMode(sData.privacy_mode);
      setRetentionDays(sData.retention_days);
      setAuditLogs(aData);
      setUsers(uData);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const updated = await api.updateSettings({
        llm_provider: selectedProvider,
        privacy_mode: privacyMode,
        retention_days: retentionDays,
        gemini_api_key: geminiApiKey.trim() ? geminiApiKey.trim() : undefined
      });
      setSettings(updated);
      setSaveSuccess(true);
      // Reload audit logs to show the settings change
      const freshLogs = await api.getAuditLogs({ limit: 100 });
      setAuditLogs(freshLogs);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeRetention = async () => {
    if (!window.confirm(`Are you sure you want to trigger manual retention purge for events older than ${retentionDays} days?`)) {
      return;
    }
    try {
      setIsPurging(true);
      setPurgeResult(null);
      const res = await api.purgeRetention();
      setPurgeResult(`Retention purge complete: ${res.purged_records} obsolete events purged.`);
      const freshLogs = await api.getAuditLogs({ limit: 100 });
      setAuditLogs(freshLogs);
    } catch (err: any) {
      alert(`Purge failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = !auditActionFilter || log.action.toLowerCase().includes(auditActionFilter.toLowerCase());
    const matchesSearch = !auditSearchTerm ||
      log.user_id.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(auditSearchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs tracking-wider mb-1">
            <SettingsIcon className="w-4 h-4" />
            <span>GOVERNANCE, PRIVACY & ACCESS CONTROL</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Security Governance</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure role-based authorization, AI model selection, evidence privacy schedules, and review immutable audit records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'users'
              ? 'bg-slate-800 text-violet-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Operator Roles & RBAC ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'model'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-cyan-400" />
          Model Strategy & LLM
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'privacy'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          Privacy & Retention Schedules
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'audit'
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          Immutable Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Operator Roles & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Authorized Operators Roster</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-configured operator accounts with cryptographic bcrypt hashing and JWT tokens.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-xs text-slate-400">
                    <th className="py-3 px-4">USERNAME</th>
                    <th className="py-3 px-4">FULL NAME</th>
                    <th className="py-3 px-4">EMAIL</th>
                    <th className="py-3 px-4">ASSIGNED ROLE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">REGISTERED AT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm font-mono text-xs">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Log in with ADMIN role to inspect full user roster.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-bold text-white">{u.username}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans">{u.full_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : u.role === 'SAFETY_OFFICER'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-400">
                          {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RBAC Privilege Matrix */}
          <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Role-Based Access Control (RBAC) Matrix</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-900/40 space-y-2">
                <div className="text-rose-400 font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  ADMIN
                </div>
                <p className="text-slate-300 text-xs font-sans">
                  Unrestricted system governance: User management, safety rule creation/deletion, policy purge execution, and secret key modification.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-900/40 space-y-2">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  SAFETY OFFICER
                </div>
                <p className="text-slate-300 text-xs font-sans">
                  Operational safety authority: Acknowledge and resolve incidents, manage safety rules, review optical evidence snapshots, and inspect audit logs.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-900/40 space-y-2">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  OPERATOR & VIEWER
                </div>
                <p className="text-slate-300 text-xs font-sans">
                  Operations monitoring: Live video observation, Ask NEXUS grounded Q&A, knowledge base document search, and telemetry inspection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Model Strategy & LLM Provider */}
      {activeTab === 'model' && (
        <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">AI Model Provider Strategy</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select between offline deterministic local grounding or cloud multimodal vision-language intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setSelectedProvider('LOCAL_GROUNDED')}
              className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                selectedProvider === 'LOCAL_GROUNDED'
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-glow-cyan'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">OFFLINE DETERMINISTIC</span>
                  {selectedProvider === 'LOCAL_GROUNDED' && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-white">Local Dense RAG & Vector Grounding</h3>
                <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Hybrid dense vector cosine embedding (128-dim) + BM25 keyword matching with strict sentence-level citation verification. 100% air-gapped, zero external network dependency, and immune to cloud API rate limits.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 font-mono text-[11px] text-cyan-300">
                Active Provider: Default Local Core
              </div>
            </div>

            <div
              onClick={() => setSelectedProvider('GOOGLE_GEMINI')}
              className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                selectedProvider === 'GOOGLE_GEMINI'
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-glow-cyan'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-violet-400">CLOUD MULTIMODAL</span>
                  {selectedProvider === 'GOOGLE_GEMINI' && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-white">Google Gemini Multimodal API</h3>
                <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Calls official Google Gemini 1.5/2.0 API for deep multimodal reasoning, frame description synthesis, and advanced cross-document synthesis.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 font-mono text-[11px] text-violet-300">
                Key Configured: {settings?.gemini_api_key_configured ? 'YES (Secured)' : 'NO'}
              </div>
            </div>
          </div>

          {selectedProvider === 'GOOGLE_GEMINI' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <label className="block text-slate-400">GOOGLE GEMINI API KEY</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter AIzaSy... API key"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] text-slate-500 block">
                Never shared publicly. Encrypted in process environment memory.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {saveSuccess ? (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Configuration saved and activated.
              </span>
            ) : <span />}

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-glow-cyan transition"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Applying Changes...' : 'Save Model Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Privacy & Evidence Retention */}
      {activeTab === 'privacy' && (
        <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Privacy Controls & Data Lifecycle Policy</h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure optical anonymization filters and automated evidence retention horizons.
            </p>
          </div>

          {/* Privacy Anonymization Mode */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-bold mb-1">OPTICAL ANONYMIZATION SHIELD</div>
                <h3 className="text-base font-bold text-white">Worker Face & Identity Blurring</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Automatically blur detected face and personal identification patches in camera frame evidence.
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setPrivacyMode('STANDARD_SECURE')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    privacyMode === 'STANDARD_SECURE'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-950 text-slate-500'
                  }`}
                >
                  STANDARD
                </button>
                <button
                  onClick={() => setPrivacyMode('ANONYMIZED_BLUR')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    privacyMode === 'ANONYMIZED_BLUR'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-500'
                  }`}
                >
                  BLUR ACTIVE
                </button>
              </div>
            </div>
          </div>

          {/* Retention Duration Slider */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">EVIDENCE SNAPSHOT RETENTION HORIZON</span>
              <span className="text-amber-400 font-bold text-base">{retentionDays} DAYS</span>
            </div>
            <input
              type="range"
              min="7"
              max="90"
              step="7"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <p className="text-[11px] text-slate-400 font-sans">
              Raw frame evidence and optical detection crops older than {retentionDays} days are permanently purged. Incident summaries, compliance audit logs, and SOP citations remain stored indefinitely.
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={handlePurgeRetention}
                disabled={isPurging}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-mono text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isPurging ? 'Purging Obsolete Records...' : 'Trigger Retention Policy Purge Now'}
              </button>
              {purgeResult && (
                <span className="text-xs text-emerald-400 font-mono">{purgeResult}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-glow-cyan transition"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Policy...' : 'Save Privacy & Retention Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Immutable Audit Log */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Immutable Security Audit Trail</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically tracked record of authentication events, policy alterations, and incident transitions.
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, action, IP..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-4">OPERATOR</th>
                  <th className="py-3 px-4">ACTION</th>
                  <th className="py-3 px-4">RESOURCE</th>
                  <th className="py-3 px-4">DETAILS</th>
                  <th className="py-3 px-4 text-right">IP ADDRESS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No audit log entries matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-300">{log.user_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{log.resource_type}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.details || ''}>
                        {log.details || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
