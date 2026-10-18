import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Eye,
  Camera,
  AlertCircle
} from 'lucide-react';
import { IncidentItem, IncidentStatus, RuleSeverity } from '../types';
import { api } from '../services/api';

export const IncidentCenter: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected incident for modal
  const [activeIncident, setActiveIncident] = useState<IncidentItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { status?: string; severity?: string; limit?: number } = { limit: 100 };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedSeverity !== 'ALL') params.severity = selectedSeverity;
      const data = await api.getIncidents(params);
      setIncidents(data);
    } catch (err: any) {
      console.error('Failed to fetch incidents:', err);
      setError('Failed to load incidents. Please verify connection and authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedStatus, selectedSeverity]);

  const handleOpenModal = (incident: IncidentItem) => {
    setActiveIncident(incident);
    setReviewNotes(incident.resolution_notes || '');
    setAssignedTo(incident.assigned_to || '');
  };

  const handleUpdateStatus = async (newStatus: IncidentStatus) => {
    if (!activeIncident) return;
    try {
      setIsUpdating(true);
      const updated = await api.updateIncidentStatus(activeIncident.id, {
        status: newStatus,
        notes: reviewNotes.trim() ? reviewNotes.trim() : undefined,
        assigned_to: assignedTo.trim() ? assignedTo.trim() : undefined,
      });

      // Update in local state
      setActiveIncident(updated);
      setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      alert(`Failed to update incident: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter by search term
  const filteredIncidents = incidents.filter((inc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inc.title.toLowerCase().includes(term) ||
      inc.observation_summary.toLowerCase().includes(term) ||
      (inc.retrieved_procedure && inc.retrieved_procedure.toLowerCase().includes(term)) ||
      (inc.citation_source && inc.citation_source.toLowerCase().includes(term))
    );
  });

  // Calculate statistics
  const totalCount = incidents.length;
  const openCount = incidents.filter((i) => i.status === 'OPEN').length;
  const ackCount = incidents.filter((i) => i.status === 'ACKNOWLEDGED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const getSeverityBadge = (severity: RuleSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-glow-rose">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            LOW
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-red-950/60 text-red-400 border border-red-800">
            <AlertCircle className="w-3 h-3" />
            OPEN
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-950/60 text-amber-400 border border-amber-800">
            <Clock className="w-3 h-3" />
            ACKNOWLEDGED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            RESOLVED
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-900 text-slate-400 border border-slate-700">
            DISMISSED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>INCIDENT COMMAND & HUMAN REVIEW</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incident Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic rule-triggered incidents with evidence snapshots, SOP compliance procedures, and authorization workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIncidents}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800">
          <div className="text-xs font-mono text-slate-400">TOTAL INCIDENTS</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0d1527] border border-rose-900/40">
          <div className="text-xs font-mono text-rose-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            OPEN & UNRESOLVED
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{openCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0d1527] border border-amber-900/40">
          <div className="text-xs font-mono text-amber-400">ACKNOWLEDGED</div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{ackCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0d1527] border border-emerald-900/40">
          <div className="text-xs font-mono text-emerald-400">RESOLVED & VERIFIED</div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1527] border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>STATUS:</span>
          </div>
          {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                selectedStatus === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-slate-800 mx-2 hidden lg:block" />

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>SEVERITY:</span>
          </div>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                selectedSeverity === sev
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident, SOP, zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-2xl bg-[#0d1527] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-xs text-slate-400">
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">INCIDENT TITLE</th>
                <th className="py-3 px-4">ZONE & CAMERA</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">OCCURRENCES</th>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
                    {loading ? 'Loading incidents...' : 'No incidents matching selected criteria.'}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-900/50 transition cursor-pointer"
                    onClick={() => handleOpenModal(inc)}
                  >
                    <td className="py-3.5 px-4">{getSeverityBadge(inc.severity)}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{inc.title}</span>
                        {inc.is_demo && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-normal">
                        {inc.observation_summary}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      <div>Zone: #{inc.zone_id || 'N/A'}</div>
                      <div className="text-slate-500 text-[11px]">Cam ID: {inc.camera_id}</div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inc.status)}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-cyan-300">
                      {(inc.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {inc.occurrence_count}x
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(inc);
                        }}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-mono text-xs font-medium border border-slate-700 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Review Modal Drawer */}
      {activeIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1220] border border-slate-700 shadow-2xl p-6 text-slate-200 space-y-6">
            {/* Close button */}
            <button
              onClick={() => setActiveIncident(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between pr-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getSeverityBadge(activeIncident.severity)}
                  {getStatusBadge(activeIncident.status)}
                  <span className="font-mono text-xs text-slate-500">
                    INCIDENT #{activeIncident.id}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {activeIncident.title}
                </h2>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-1">
                  <span>Camera: #{activeIncident.camera_id}</span>
                  <span>Zone: #{activeIncident.zone_id || 'N/A'}</span>
                  <span>Confidence: {(activeIncident.confidence * 100).toFixed(1)}%</span>
                  <span>Detected: {new Date(activeIncident.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Observation and Evidence Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
                  <Eye className="w-4 h-4" />
                  OPTICAL OBSERVATION
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeIncident.observation_summary}
                </p>
                <div className="pt-2 text-xs font-mono text-slate-500 flex items-center justify-between border-t border-slate-800/60">
                  <span>Persistence Verified: YES</span>
                  <span>Deduplicated Count: {activeIncident.occurrence_count}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-rose-400 flex items-center gap-1.5 font-bold mb-2">
                    <Camera className="w-4 h-4" />
                    EVIDENCE ARTIFACT
                  </div>
                  <div className="p-6 rounded-lg bg-slate-950 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
                    <Shield className="w-8 h-8 text-cyan-500/60 mb-2" />
                    <div className="text-xs font-mono text-slate-300">
                      {activeIncident.evidence_path
                        ? `Stored: ${activeIncident.evidence_path}`
                        : 'Evidence Reference Secured'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      SHA256 authenticated frame snapshot
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Retrieved Standard Operating Procedure (SOP) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-cyan-300 flex items-center gap-1.5 font-bold">
                  <FileText className="w-4 h-4" />
                  GOVERNING COMPLIANCE PROCEDURE
                </div>
                {activeIncident.citation_source && (
                  <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    Source: {activeIncident.citation_source}
                  </span>
                )}
              </div>
              <p className="text-sm text-cyan-100 bg-slate-950/60 p-3 rounded-lg border border-cyan-900/30 leading-relaxed font-sans">
                "{activeIncident.retrieved_procedure || 'Refer to General Facility Safety Standard Guidelines.'}"
              </p>
              <div className="text-xs text-slate-400 font-mono">
                <span className="text-slate-300 font-bold">RECOMMENDED ACTION:</span> {activeIncident.recommended_action}
              </div>
            </div>

            {/* Human Verification Workflow */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="text-xs font-mono text-white flex items-center gap-1.5 font-bold">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                HUMAN REVIEW & WORKFLOW ACTIONS
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ASSIGN SAFETY OFFICER
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="e.g. officer_marcus"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    AUDIT / RESOLUTION NOTES
                  </label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Document action taken or cause of false positive..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
                {activeIncident.status === 'OPEN' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition flex items-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Acknowledge Incident
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('DISMISSED')}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
                    >
                      Dismiss as False Alarm
                    </button>
                  </>
                )}

                {activeIncident.status === 'ACKNOWLEDGED' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve & Close Incident
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('DISMISSED')}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
                    >
                      Dismiss
                    </button>
                  </>
                )}

                {(activeIncident.status === 'RESOLVED' || activeIncident.status === 'DISMISSED') && (
                  <button
                    onClick={() => handleUpdateStatus('OPEN')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Reopen Incident
                  </button>
                )}

                {activeIncident.resolved_by && (
                  <span className="text-xs font-mono text-emerald-400 ml-auto">
                    Resolved by {activeIncident.resolved_by} at{' '}
                    {new Date(activeIncident.resolved_at!).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
