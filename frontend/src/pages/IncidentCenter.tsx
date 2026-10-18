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
      console.warn('Using existing incident state or API offline');
      setError('Unable to refresh live incidents from backend.');
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

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'OPEN':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-red-50 text-red-700 border border-red-200">OPEN</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">ACKNOWLEDGED</span>;
      case 'RESOLVED':
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-slate-50 text-slate-700 border border-slate-200">{st}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Incident Review & Triage Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of verified safety anomalies, visual evidence records, and human-in-the-loop resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">
            {filteredIncidents.length} Records Found
          </span>
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition"
            title="Refresh incident list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by title, procedure, or observation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Status and Severity Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <span>Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            {loading ? 'Querying incident repository...' : 'No incidents match active query filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60 font-mono text-[11px]">
                  <th className="py-2.5 px-4 font-medium">Incident ID</th>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Designated Area</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Assignee</th>
                  <th className="py-2.5 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">INC-{inc.id}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(inc.created_at || inc.last_detected_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {inc.zone_id ? `Zone ${inc.zone_id}` : 'General Floor'}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{inc.title}</td>
                    <td className="py-2.5 px-4">{getSeverityBadge(inc.severity)}</td>
                    <td className="py-2.5 px-4">{getStatusBadge(inc.status)}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                      {inc.assigned_to || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => handleOpenModal(inc)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {activeIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-sm text-slate-900">INC-{activeIncident.id}</span>
                {getSeverityBadge(activeIncident.severity)}
                {getStatusBadge(activeIncident.status)}
              </div>
              <button
                onClick={() => setActiveIncident(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Evidence Snapshot */}
              {activeIncident.evidence_path && (
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block mb-1.5">
                    Visual Evidence Frame:
                  </span>
                  <div className="rounded border border-slate-200 overflow-hidden bg-slate-950 max-h-56 flex items-center justify-center">
                    <img
                      src={activeIncident.evidence_path}
                      alt="Visual Evidence Snapshot"
                      className="max-h-56 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Observation Summary */}
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">
                  Sensor Telemetry & Observation:
                </span>
                <p className="text-slate-800 font-medium">
                  {activeIncident.observation_summary}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-600">
                  <div>Detected: <strong>{new Date(activeIncident.created_at || activeIncident.last_detected_at).toLocaleTimeString()}</strong></div>
                  <div>Sensor: <strong>CAM-{activeIncident.camera_id}</strong></div>
                  <div>Area: <strong>{activeIncident.zone_id ? `Zone ${activeIncident.zone_id}` : 'General'}</strong></div>
                  <div>Occurrences: <strong>{activeIncident.occurrence_count} Records</strong></div>
                </div>
              </div>

              {/* Retrieved Compliance Procedure */}
              {activeIncident.retrieved_procedure && (
                <div className="p-3.5 rounded bg-blue-50/50 border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-blue-900 font-semibold">
                      Standard Operating Procedure (RAG Grounded):
                    </span>
                    {activeIncident.citation_source && (
                      <span className="text-[11px] font-mono text-blue-700">
                        Source: {activeIncident.citation_source}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed">
                    {activeIncident.retrieved_procedure}
                  </p>
                </div>
              )}

              {/* Reviewer & Resolution Input */}
              <div className="space-y-3 pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Investigator</label>
                  <input
                    type="text"
                    placeholder="e.g. operator@nexus.ai"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Investigation Notes & Actions</label>
                  <textarea
                    rows={2}
                    placeholder="Document root cause, containment actions, or safety sign-off..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                Status: {activeIncident.status}
              </span>

              <div className="flex items-center gap-2">
                {activeIncident.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition"
                  >
                    Acknowledge Incident
                  </button>
                )}

                {activeIncident.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                  >
                    Mark Resolved
                  </button>
                )}

                {activeIncident.status === 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus('OPEN')}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium transition"
                  >
                    Reopen Incident
                  </button>
                )}

                <button
                  onClick={() => setActiveIncident(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
