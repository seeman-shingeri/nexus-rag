import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Sliders,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Trash2,
  X,
  Zap,
  Info,
  RefreshCw
} from 'lucide-react';
import { SafetyRule, RuleSeverity, RuleSimulationResult } from '../types';
import { api } from '../services/api';

export const SafetyRules: React.FC = () => {
  const [rules, setRules] = useState<SafetyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'simulator'>('catalog');

  // Create rule modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'liquid_spill',
    severity: 'MEDIUM' as RuleSeverity,
    confidence_threshold: 0.70,
    persistence_seconds: 3,
    cooldown_minutes: 5,
    zone_id: 1,
    is_active: true,
    requires_human_approval: true,
    standard_procedure: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulation state
  const [simCategory, setSimCategory] = useState('liquid_spill');
  const [simConfidence, setSimConfidence] = useState(0.85);
  const [simDuration, setSimDuration] = useState(4.0);
  const [simZoneId, setSimZoneId] = useState<number>(1);
  const [simResult, setSimResult] = useState<RuleSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.getSafetyRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch safety rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name || !newRule.standard_procedure) {
      alert('Please fill in Rule Name and Standard Procedure.');
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await api.createSafetyRule(newRule);
      setRules((prev) => [...prev, created]);
      setIsCreateOpen(false);
      setNewRule({
        name: '',
        description: '',
        category: 'liquid_spill',
        severity: 'MEDIUM',
        confidence_threshold: 0.70,
        persistence_seconds: 3,
        cooldown_minutes: 5,
        zone_id: 1,
        is_active: true,
        requires_human_approval: true,
        standard_procedure: ''
      });
    } catch (err: any) {
      alert(`Failed to create rule: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Safety Rule #${id}?`)) return;
    try {
      await api.deleteSafetyRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(`Failed to delete rule: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleToggleActive = async (rule: SafetyRule) => {
    try {
      const updated = await api.updateSafetyRule(rule.id, { is_active: !rule.is_active });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      alert(`Failed to update rule: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const result = await api.simulateSafetyRule({
        category: simCategory,
        confidence: simConfidence,
        duration_seconds: simDuration,
        zone_id: simZoneId
      });
      setSimResult(result);
    } catch (err: any) {
      alert(`Simulation error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const getSeverityBadge = (severity: RuleSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-500/50">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>DETERMINISTIC LOGIC & SIMULATION</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Deterministic Safety Rules Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure categorical detection rules, confidence thresholds, persistence duration, and hysteresis cooldown windows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-glow-cyan transition"
          >
            <Plus className="w-4 h-4" />
            New Safety Rule
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'catalog'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Active Rules Catalog ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition ${
            activeTab === 'simulator'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-400" />
          Rule Simulation Sandbox
        </button>
      </div>

      {/* Tab 1: Rules Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl bg-[#0d1527] border transition flex flex-col justify-between ${
                  rule.is_active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(rule.severity)}
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
                        {rule.category}
                      </span>
                      {rule.zone_id && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                          Zone #{rule.zone_id}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        rule.is_active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{rule.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{rule.description}</p>

                  <div className="grid grid-cols-3 gap-2 p-3 mt-4 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">CONFIDENCE</div>
                      <div className="text-cyan-300 font-bold mt-0.5">
                        {(rule.confidence_threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">PERSISTENCE</div>
                      <div className="text-amber-300 font-bold mt-0.5">{rule.persistence_seconds}s</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">COOLDOWN</div>
                      <div className="text-slate-300 font-bold mt-0.5">{rule.cooldown_minutes}m</div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                    <div className="text-[10px] font-mono text-cyan-400/80 mb-0.5 font-bold flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      STANDARD PROCEDURE:
                    </div>
                    <p className="text-slate-300 text-xs line-clamp-2 italic">"{rule.standard_procedure}"</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60 text-xs">
                  <span className="font-mono text-slate-500 text-[11px]">
                    Requires Human Sign-off: {rule.requires_human_approval ? 'YES' : 'NO'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSimCategory(rule.category);
                        setSimZoneId(rule.zone_id || 1);
                        setActiveTab('simulator');
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 text-cyan-400" />
                      Test
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Rule Simulation Sandbox */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulation Controls */}
          <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-wider mb-1">
                <Play className="w-4 h-4" />
                <span>TELEMETRY INJECTION SANDBOX</span>
              </div>
              <h2 className="text-lg font-bold text-white">Rule Tester & Evaluation Sandbox</h2>
              <p className="text-xs text-slate-400 mt-1">
                Inject test observations to simulate whether an alert would trigger, verify persistence constraints, and preview RAG compliance linking.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">DETECTION CATEGORY</label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="liquid_spill">liquid_spill (Puddle, Lubricant)</option>
                  <option value="person">person (Personnel Intrusion)</option>
                  <option value="blocked_exit">blocked_exit (Egress Obstruction)</option>
                  <option value="missing_ppe_helmet">missing_ppe_helmet (Hardhat Non-compliance)</option>
                  <option value="fire_smoke_suspicion">fire_smoke_suspicion (Thermal/Visual Anomaly)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ZONE ASSIGNMENT</label>
                <select
                  value={simZoneId}
                  onChange={(e) => setSimZoneId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>Zone 1 - Heavy Machinery & CNC Assembly</option>
                  <option value={2}>Zone 2 - Chemical Storage Vault</option>
                  <option value={3}>Zone 3 - Logistics Bay & Pallet Transit</option>
                  <option value={4}>Zone 4 - Walkway & Emergency Egress</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>DETECTION CONFIDENCE</span>
                  <span className="text-cyan-400 font-bold">{(simConfidence * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={simConfidence}
                  onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>OBSERVATION DURATION (PERSISTENCE)</span>
                  <span className="text-amber-400 font-bold">{simDuration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={simDuration}
                  onChange={(e) => setSimDuration(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {isSimulating ? 'Evaluating Deterministic Policy...' : 'Execute Test Simulation'}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl flex flex-col justify-between">
            {simResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-400">SIMULATION OUTCOME</div>
                  {simResult.alert_triggered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500 shadow-glow-rose">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ALERT DISPATCH TRIGGERED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                      ALERT SUPPRESSED (NORMAL)
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">MATCHED POLICY:</span>
                    <span className="text-white font-bold">{simResult.matched_rule_name || 'Generic Category Policy'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">CONFIDENCE CHECK:</span>
                    <span className={simResult.confidence_met ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                      {simResult.confidence_met ? 'PASS' : 'FAIL'} ({(simResult.observed_confidence * 100).toFixed(0)}% vs required {(simResult.required_confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">PERSISTENCE CHECK:</span>
                    <span className={simResult.persistence_met ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {simResult.persistence_met ? 'PASS' : 'FAIL'} ({simResult.observed_duration_seconds.toFixed(1)}s vs required {simResult.required_persistence_seconds}s)
                    </span>
                  </div>
                </div>

                {/* SOP Procedure */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-900/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      LINKED COMPLIANCE SOP
                    </span>
                    {simResult.citation_source && (
                      <span className="text-[10px] text-cyan-500">{simResult.citation_source}</span>
                    )}
                  </div>
                  <p className="text-xs text-cyan-100 bg-slate-950/60 p-2.5 rounded border border-cyan-900/20 italic">
                    "{simResult.linked_sop_excerpt}"
                  </p>
                </div>

                {/* Recommendation and Notes */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-2">
                  <div>
                    <span className="text-slate-400 font-bold">DIAGNOSTIC NOTES:</span>
                    <p className="text-slate-300 mt-0.5">{simResult.simulation_notes}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-cyan-400 font-bold">ACTION DISPATCHED:</span>
                    <p className="text-slate-200 mt-0.5">{simResult.recommended_action}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs space-y-2">
                <Info className="w-8 h-8 text-slate-600 mb-1" />
                <div className="text-slate-300 font-bold">SIMULATION IDLE</div>
                <p>Configure detection category, confidence, and duration on the left, then click Execute Test Simulation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Rule Modal Drawer */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0b1220] border border-slate-700 shadow-2xl p-6 text-slate-200 space-y-5">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Create Deterministic Safety Rule</h2>
              <p className="text-xs text-slate-400 mt-1">
                Define criteria for visual condition verification, persistence duration, and hysteresis cooldown.
              </p>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">RULE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RULE-SPILL-05: Loading Dock Fluid Discharge"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="Operational trigger explanation..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">CATEGORY</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="liquid_spill">liquid_spill</option>
                    <option value="person">person</option>
                    <option value="blocked_exit">blocked_exit</option>
                    <option value="missing_ppe_helmet">missing_ppe_helmet</option>
                    <option value="fire_smoke_suspicion">fire_smoke_suspicion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SEVERITY</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as RuleSeverity })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">MIN CONFIDENCE</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={newRule.confidence_threshold}
                    onChange={(e) => setNewRule({ ...newRule, confidence_threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PERSIST (SEC)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newRule.persistence_seconds}
                    onChange={(e) => setNewRule({ ...newRule, persistence_seconds: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">COOLDOWN (MIN)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newRule.cooldown_minutes}
                    onChange={(e) => setNewRule({ ...newRule, cooldown_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GOVERNING STANDARD PROCEDURE (SOP)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. SOP-ENV-204: Deploy sorbent socks immediately, isolate zone electrical feeds..."
                  value={newRule.standard_procedure}
                  onChange={(e) => setNewRule({ ...newRule, standard_procedure: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition"
                >
                  {isSubmitting ? 'Saving Policy...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
