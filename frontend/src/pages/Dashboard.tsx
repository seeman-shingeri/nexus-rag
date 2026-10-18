import React, { useEffect, useState } from 'react';
import { 
  Video, 
  AlertTriangle, 
  FileText, 
  Layers, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { SystemStatus, ActiveScreen, IncidentItem } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (screen: ActiveScreen) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const loadDashboardData = async () => {
    try {
      const [statusData, incidentsData] = await Promise.all([
        api.getSystemStatus(),
        api.getIncidents({ limit: 8 }).catch(() => [])
      ]);
      setStatus(statusData);
      setRecentIncidents(incidentsData);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Dashboard data fetch in progress or backend offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute severity breakdown from real incidents
  const criticalCount = recentIncidents.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = recentIncidents.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = recentIncidents.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = recentIncidents.filter((i) => i.severity === 'LOW').length;
  const totalSeverity = recentIncidents.length || 1;

  const cameras = [
    { id: 'CAM-01', name: 'Main Fabrication Floor', zone: 'Zone 1', type: 'Local Webcam', res: '1280x720', fps: '25 fps', status: 'Online' },
    { id: 'CAM-02', name: 'Chemical Storage Vault', zone: 'Zone 2 (Restricted)', type: 'Synthetic Simulation', res: '1280x720', fps: '15 fps', status: 'Online' },
    { id: 'CAM-03', name: 'Loading Bay Beta', zone: 'Zone 3', type: 'Synthetic Simulation', res: '1920x1080', fps: '30 fps', status: 'Online' },
    { id: 'CAM-04', name: 'Server Infrastructure', zone: 'Zone 4 (Restricted)', type: 'Synthetic Simulation', res: '1280x720', fps: '15 fps', status: 'Online' },
  ];

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
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Facility Operations Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status of vision sensors, rule evaluation engine, and compliance procedure retrieval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Telemetry updated: {lastUpdated}</span>
          <button
            onClick={loadDashboardData}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Optical Streams */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono uppercase">Optical Feeds</span>
            <Video className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {status?.active_cameras ?? 4}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Online</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">1 Webcam · 3 Demo streams</div>
        </div>

        {/* Open Incidents */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono uppercase">Open Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {status?.open_incidents ?? recentIncidents.filter(i => i.status === 'OPEN').length}
            </span>
            <span className="text-xs text-slate-600">
              ({status?.critical_alerts ?? criticalCount} Critical)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Hysteresis deduplication active</div>
        </div>

        {/* Ingested Documents */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono uppercase">Safety Documents</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {status?.indexed_documents ?? 4}
            </span>
            <span className="text-xs text-slate-600">
              ({status?.total_chunks ?? 16} Chunks)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Dense vector index (pgvector)</div>
        </div>

        {/* Facility Zones */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-mono uppercase">Facility Zones</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {status?.active_zones ?? 4}
            </span>
            <span className="text-xs text-slate-600">Monitored</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">2 General · 2 Restricted</div>
        </div>
      </div>

      {/* Main Operational 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Camera Matrix & Recent Events Table */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Camera Streams Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
                  Optical Sensor Feeds
                </h2>
              </div>
              <button
                onClick={() => onNavigate('vision')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
              >
                <span>Open Live Vision</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/40 font-mono text-[11px]">
                    <th className="py-2.5 px-4 font-medium">Sensor ID</th>
                    <th className="py-2.5 px-4 font-medium">Designated Area</th>
                    <th className="py-2.5 px-4 font-medium">Feed Source</th>
                    <th className="py-2.5 px-4 font-medium">Profile</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cameras.map((cam) => (
                    <tr key={cam.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{cam.id}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{cam.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{cam.zone}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">{cam.type}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{cam.res} @ {cam.fps}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {cam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Incident Records Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
                  Recent Verified Incident Records
                </h2>
              </div>
              <button
                onClick={() => onNavigate('incidents')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
              >
                <span>View All Incidents</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No open incidents detected. All facility safety conditions optimal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/40 font-mono text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Record ID</th>
                      <th className="py-2.5 px-4 font-medium">Time</th>
                      <th className="py-2.5 px-4 font-medium">Category</th>
                      <th className="py-2.5 px-4 font-medium">Severity</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentIncidents.slice(0, 5).map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">INC-{inc.id}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(inc.created_at || inc.last_detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{inc.title}</td>
                        <td className="py-2.5 px-4">{getSeverityBadge(inc.severity)}</td>
                        <td className="py-2.5 px-4">{getStatusBadge(inc.status)}</td>
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => onNavigate('incidents')}
                            className="text-blue-600 hover:text-blue-800 font-medium text-[11px]"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Severity Sparkline & Engine Assurance */}
        <div className="lg:col-span-4 space-y-5">
          {/* Incident Severity Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
              Incident Severity Distribution
            </h3>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium text-red-700">Critical</span>
                  <span className="font-mono">{criticalCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(criticalCount / totalSeverity) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium text-amber-700">High</span>
                  <span className="font-mono">{highCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(highCount / totalSeverity) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium text-blue-700">Medium</span>
                  <span className="font-mono">{mediumCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(mediumCount / totalSeverity) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium text-slate-700">Low</span>
                  <span className="font-mono">{lowCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(lowCount / totalSeverity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Engine Parameters */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
              System Architecture & Integrity
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500">Vector Retrieval:</span>
                <span className="font-mono text-slate-800 font-medium">pgvector Cosine</span>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500">Rule Logic:</span>
                <span className="font-mono text-slate-800 font-medium">Deterministic</span>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500">Deduplication Cooldown:</span>
                <span className="font-mono text-slate-800 font-medium">5 Minutes</span>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500">Privacy Retention:</span>
                <span className="font-mono text-slate-800 font-medium">30 Days Auto-Purge</span>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500">Human Verification:</span>
                <span className="font-mono text-emerald-700 font-medium">Mandatory for Alert Triage</span>
              </div>
            </div>
          </div>

          {/* Direct Workflow Navigation */}
          <div className="bg-slate-100/70 rounded-lg border border-slate-200 p-4 space-y-2.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Quick Operations
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() => onNavigate('ask')}
                className="w-full text-left px-3 py-2 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium flex items-center justify-between transition shadow-sm"
              >
                <span>Query Safety SOPs</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('twin')}
                className="w-full text-left px-3 py-2 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium flex items-center justify-between transition shadow-sm"
              >
                <span>Inspect Facility Digital Twin</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('rules')}
                className="w-full text-left px-3 py-2 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium flex items-center justify-between transition shadow-sm"
              >
                <span>Configure Safety Thresholds</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
