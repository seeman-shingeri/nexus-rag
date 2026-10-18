import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';
import { SafetyRule, RuleSeverity, RuleSimulationResult } from '../types';
import { api } from '../services/api';

const DEFAULT_SAFETY_RULES: SafetyRule[] = [
  {
    id: 1,
    name: "PPE Mandatory Compliance",
    description: "Detects missing hardhats, eye protection, or safety vests in active machinery zones.",
    category: "no_ppe",
    severity: "HIGH",
    confidence_threshold: 0.80,
    persistence_seconds: 2,
    cooldown_minutes: 5,
    zone_id: 1,
    is_active: true,
    requires_human_approval: true,
    standard_procedure: "Issue verbal safety warning via floor speaker. Halt machinery if operator fails to don PPE within 60 seconds.",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Chemical & Liquid Spill Alert",
    description: "Monitors fabrication and staging floors for hazardous or slip-risk liquid pooling.",
    category: "liquid_spill",
    severity: "HIGH",
    confidence_threshold: 0.75,
    persistence_seconds: 3,
    cooldown_minutes: 5,
    zone_id: 1,
    is_active: true,
    requires_human_approval: true,
    standard_procedure: "Deploy yellow hazard cones immediately. Consult SOP-ENV-204 for containment boom deployment.",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Restricted Vault Intrusion",
    description: "Flags any unauthorized human presence inside the chemical storage vault without Tier-3 badge verification.",
    category: "unauthorized_person",
    severity: "CRITICAL",
    confidence_threshold: 0.85,
    persistence_seconds: 1,
    cooldown_minutes: 2,
    zone_id: 2,
    is_active: true,
    requires_human_approval: true,
    standard_procedure: "Trigger optical access alarm. Alert on-duty safety officer and lock down vault perimeter doors.",
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    name: "Thermal & Fire Anomaly",
    description: "Optical detection of open flames, sudden combustion, or rapid smoke accumulation.",
    category: "fire_hazard",
    severity: "CRITICAL",
    confidence_threshold: 0.80,
    persistence_seconds: 2,
    cooldown_minutes: 1,
    zone_id: null,
    is_active: true,
    requires_human_approval: false,
    standard_procedure: "Sound facility evacuation siren. Dispatch plant fire brigade and shut down natural gas feeder valves.",
    created_at: new Date().toISOString()
  }
];

export const SafetyRules: React.FC = () => {
  const [rules, setRules] = useState<SafetyRule[]>(DEFAULT_SAFETY_RULES);
  const [loading, setLoading] = useState(false);
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
      const data = await api.getSafetyRules();
      if (data && data.length > 0) {
        setRules(data);
      }
    } catch (err) {
      console.warn('Using default safety rule set');
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
      alert('Please fill in Rule Name and Standard Operating Procedure.');
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

  const handleToggleRule = async (rule: SafetyRule) => {
    try {
      const updated = await api.updateSafetyRule(rule.id, { is_active: !rule.is_active });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      // Local toggle for responsive preview
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
    }
  };

  const handleDeleteRule = async (id: number, name: string) => {
    if (!window.confirm(`Permanently delete safety rule '${name}'?`)) return;
    try {
      await api.deleteSafetyRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await api.simulateSafetyRule({
        category: simCategory,
        confidence: simConfidence,
        duration_seconds: simDuration,
        zone_id: simZoneId
      });
      setSimResult(res);
    } catch (err: any) {
      // Fallback deterministic local evaluation
      const matched = rules.find((r) => r.category === simCategory && (r.zone_id === null || r.zone_id === simZoneId));
      if (matched) {
        const confMet = simConfidence >= matched.confidence_threshold;
        const durMet = simDuration >= matched.persistence_seconds;
        setSimResult({
          matched_rule_id: matched.id,
          matched_rule_name: matched.name,
          severity: matched.severity,
          confidence_met: confMet,
          persistence_met: durMet,
          alert_triggered: confMet && durMet,
          required_confidence: matched.confidence_threshold,
          observed_confidence: simConfidence,
          required_persistence_seconds: matched.persistence_seconds,
          observed_duration_seconds: simDuration,
          linked_sop_excerpt: matched.standard_procedure,
          citation_source: "Facility Safety Manual",
          recommended_action: confMet && durMet ? "Deploy containment protocol immediately" : "Log observation without alert",
          simulation_notes: confMet && durMet ? "Threshold and persistence criteria satisfied" : "Criteria not met"
        });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-red-50 text-red-700 border border-red-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">MEDIUM</span>;
      default:
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-slate-50 text-slate-700 border border-slate-200">{sev}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Safety Rules & Policy Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic thresholds, spatial bounds, and persistence criteria for automated hazard validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex rounded border border-slate-200 bg-white p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded transition ${
                activeTab === 'catalog' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rule Catalog
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1 rounded transition ${
                activeTab === 'simulator' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rule Simulator
            </button>
          </div>

          {activeTab === 'catalog' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium tracking-wide transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Catalog Table */}
      {activeTab === 'catalog' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60 font-mono text-[11px]">
                  <th className="py-2.5 px-4 font-medium">Rule Name</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Applicable Area</th>
                  <th className="py-2.5 px-4 font-medium">Threshold</th>
                  <th className="py-2.5 px-4 font-medium">Persistence</th>
                  <th className="py-2.5 px-4 font-medium">Cooldown</th>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{rule.name}</div>
                      <div className="text-[11px] text-slate-500 font-sans line-clamp-1">{rule.description}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800">{rule.category}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      {rule.zone_id ? `Zone ${rule.zone_id}` : 'All Zones'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      ≥ {(rule.confidence_threshold * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">{rule.persistence_seconds}s</td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">{rule.cooldown_minutes}m</td>
                    <td className="py-2.5 px-4">{getSeverityBadge(rule.severity)}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                          rule.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSimCategory(rule.category);
                            setSimZoneId(rule.zone_id || 1);
                            setSimConfidence(rule.confidence_threshold);
                            setSimDuration(rule.persistence_seconds);
                            setActiveTab('simulator');
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition"
                        >
                          Simulate
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id, rule.name)}
                          className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab Content: Rule Simulator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Simulator Controls (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase font-mono block">
                Rule Evaluation Sandbox
              </span>
              <p className="text-slate-500 text-xs mt-0.5">
                Simulate raw camera perception parameters against the deterministic safety engine.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Perception Category</label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="liquid_spill">liquid_spill (Liquid Pooling / Leak)</option>
                  <option value="no_ppe">no_ppe (Missing PPE Hazard)</option>
                  <option value="unauthorized_person">unauthorized_person (Restricted Breach)</option>
                  <option value="fire_hazard">fire_hazard (Thermal / Flame Anomaly)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700">Observed Confidence</label>
                  <span className="font-mono text-xs text-slate-900 font-semibold">{(simConfidence * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="1.00"
                  step="0.01"
                  value={simConfidence}
                  onChange={(e) => setSimConfidence(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-700">Observed Persistence Duration</label>
                  <span className="font-mono text-xs text-slate-900 font-semibold">{simDuration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={simDuration}
                  onChange={(e) => setSimDuration(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Facility Zone</label>
                <select
                  value={simZoneId}
                  onChange={(e) => setSimZoneId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value={1}>Zone 1: Main Fabrication Floor</option>
                  <option value={2}>Zone 2: Chemical Storage Vault (Restricted)</option>
                  <option value={3}>Zone 3: Loading Dock Beta</option>
                  <option value={4}>Zone 4: Server Infrastructure (Restricted)</option>
                </select>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition shadow-sm flex items-center justify-center gap-1.5 mt-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSimulating ? 'Simulating Engine...' : 'Run Deterministic Evaluation'}</span>
              </button>
            </div>
          </div>

          {/* Simulation Output Card (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase font-mono">
                Engine Evaluation Output
              </span>
              {simResult && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                  simResult.alert_triggered
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {simResult.alert_triggered ? 'ALERT TRIGGERED' : 'CONDITION SUPPRESSED'}
                </span>
              )}
            </div>

            {simResult ? (
              <div className="space-y-3 text-xs">
                {/* Metric Match Checklist */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded border ${simResult.confidence_met ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Confidence Check:</div>
                    <div className="font-semibold font-mono mt-0.5 flex items-center gap-1 text-slate-900">
                      {simResult.confidence_met ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                      <span>{(simResult.observed_confidence * 100).toFixed(0)}% (Req: {(simResult.required_confidence * 100).toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded border ${simResult.persistence_met ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Persistence Check:</div>
                    <div className="font-semibold font-mono mt-0.5 flex items-center gap-1 text-slate-900">
                      {simResult.persistence_met ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                      <span>{simResult.observed_duration_seconds.toFixed(1)}s (Req: {simResult.required_persistence_seconds}s)</span>
                    </div>
                  </div>
                </div>

                {/* Matched Policy & SOP Excerpt */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[11px] font-semibold text-slate-900">
                      Matched Policy: {simResult.matched_rule_name}
                    </span>
                    {simResult.severity && getSeverityBadge(simResult.severity)}
                  </div>
                  {simResult.linked_sop_excerpt && (
                    <p className="text-slate-700 text-xs leading-relaxed">
                      {simResult.linked_sop_excerpt}
                    </p>
                  )}
                </div>

                {/* Recommended Next Step */}
                <div className="p-3 rounded bg-blue-50/40 border border-blue-200 text-xs space-y-1">
                  <span className="font-mono text-[10px] uppercase text-blue-900 font-semibold block">
                    Recommended Response Action:
                  </span>
                  <p className="text-slate-800 font-medium">
                    {simResult.recommended_action}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-mono">
                Configure parameters and click 'Run Deterministic Evaluation' to preview rule engine behavior.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-sm text-slate-900">Create Deterministic Safety Rule</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Spill Hazard Containment"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hazard Category</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs text-slate-800"
                  >
                    <option value="liquid_spill">liquid_spill</option>
                    <option value="no_ppe">no_ppe</option>
                    <option value="unauthorized_person">unauthorized_person</option>
                    <option value="fire_hazard">fire_hazard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Severity Level</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as RuleSeverity })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs text-slate-800"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-[11px] font-sans font-medium text-slate-700 mb-1">Threshold</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    value={newRule.confidence_threshold}
                    onChange={(e) => setNewRule({ ...newRule, confidence_threshold: parseFloat(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans font-medium text-slate-700 mb-1">Persistence (s)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newRule.persistence_seconds}
                    onChange={(e) => setNewRule({ ...newRule, persistence_seconds: parseInt(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans font-medium text-slate-700 mb-1">Cooldown (m)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newRule.cooldown_minutes}
                    onChange={(e) => setNewRule({ ...newRule, cooldown_minutes: parseInt(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Standard Operating Procedure</label>
                <textarea
                  rows={2}
                  placeholder="Approved procedure to present upon hazard detection..."
                  value={newRule.standard_procedure}
                  onChange={(e) => setNewRule({ ...newRule, standard_procedure: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                >
                  {isSubmitting ? 'Saving...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
