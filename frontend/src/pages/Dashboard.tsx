import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Camera, 
  BookOpen, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SystemStatus, ActiveScreen } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (screen: ActiveScreen) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.getSystemStatus();
        setStatus(data);
      } catch (err) {
        console.error('Failed to load system status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / System Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            ACTIVE MULTIMODAL SAFETY TELEMETRY
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Central Operations Cockpit</h1>
          <p className="text-sm text-slate-400 mt-1">
            Synchronizing live visual perception, deterministic rule persistence, and document retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('vision')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-glow-cyan transition"
          >
            <Camera className="w-4 h-4" />
            <span>OPEN LIVE VISION</span>
          </button>
          <button
            onClick={() => onNavigate('ask')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold transition"
          >
            <span>ASK NEXUS</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Cameras */}
        <div className="p-5 rounded-xl bg-[#0d1527]/80 border border-slate-800 hover:border-cyan-800/60 transition group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>OPTICAL STREAMS</span>
            <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-100">{status?.active_cameras ?? 4}</span>
            <span className="text-xs text-emerald-400 font-mono">Connected</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">1 Webcam + 3 Synthetic streams</div>
        </div>

        {/* Open Incidents */}
        <div className="p-5 rounded-xl bg-[#0d1527]/80 border border-slate-800 hover:border-rose-800/60 transition group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>OPEN INCIDENTS</span>
            <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-100">{status?.open_incidents ?? 0}</span>
            <span className={`text-xs font-mono ${
              status?.critical_alerts ? 'text-rose-400 font-bold' : 'text-slate-400'
            }`}>
              {status?.critical_alerts ? `${status.critical_alerts} Critical` : '0 Critical'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Hysteresis deduplication active</div>
        </div>

        {/* Compliance Knowledge Base */}
        <div className="p-5 rounded-xl bg-[#0d1527]/80 border border-slate-800 hover:border-violet-800/60 transition group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>INDEXED SOPs</span>
            <BookOpen className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-100">{status?.indexed_documents ?? 4}</span>
            <span className="text-xs text-violet-400 font-mono">{status?.total_chunks ?? 16} Chunks</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Dense vector + BM25 RAG index</div>
        </div>

        {/* Digital Twin Zones */}
        <div className="p-5 rounded-xl bg-[#0d1527]/80 border border-slate-800 hover:border-emerald-800/60 transition group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>FACILITY ZONES</span>
            <Layers className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-100">{status?.active_zones ?? 4}</span>
            <span className="text-xs text-emerald-400 font-mono">Monitored</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">Spatial boundaries mapped</div>
        </div>
      </div>

      {/* Cameras Grid & Recent Incidents Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Camera Feeds Preview */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d1527]/70 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono text-sm font-bold text-slate-200">OPTICAL SENSOR MONITORING</h3>
            </div>
            <button
              onClick={() => onNavigate('vision')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Full Sensor Grid</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'CAM-01', name: 'Assembly Bay Overhead', zone: 'Zone A', status: 'ACTIVE', type: 'Local / Webcam' },
              { id: 'CAM-02', name: 'Chemical Vault Entry', zone: 'Zone B', status: 'ACTIVE (DEMO)', type: 'RTSP Stream' },
              { id: 'CAM-03', name: 'Loading Bay Corridor', zone: 'Zone C', status: 'ACTIVE (DEMO)', type: 'RTSP Stream' },
              { id: 'CAM-04', name: 'Emergency Exit Portal', zone: 'Zone D', status: 'ACTIVE (DEMO)', type: 'RTSP Stream' },
            ].map((cam) => (
              <div key={cam.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-300">{cam.id}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    {cam.status}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200 truncate">{cam.name}</div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
                  <span>{cam.zone}</span>
                  <span>{cam.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Safety Status & Grounding Policy */}
        <div className="rounded-2xl bg-[#0d1527]/70 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold text-slate-200">SAFETY ASSURANCE MATRIX</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 mb-1">DETERMINISTIC COOLDOWN</div>
              <div className="text-slate-200 font-semibold">5-Minute Duplicate Suppression</div>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">
                Repeated observations of the same condition are grouped into an existing incident rather than flooding alerts.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 mb-1">EVIDENCE GROUNDING</div>
              <div className="text-slate-200 font-semibold">100% Traceable Citations</div>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">
                Every generated alert links directly to ingested compliance SOPs with zero generative hallucination.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 mb-1">PRIVACY RETENTION POLICY</div>
              <div className="text-slate-200 font-semibold">30-Day Auto Purge</div>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">
                Transitory video frames are dropped from RAM instantly; verified evidence snapshots auto-expire.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
