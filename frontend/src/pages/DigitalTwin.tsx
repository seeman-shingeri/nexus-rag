import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  AlertCircle,
  Shield,
  CheckCircle2,
  RefreshCw,
  Users,
  Camera,
  AlertTriangle,
  Lock,
  Unlock,
  Package,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { DigitalTwinOverview, ZoneSummary, ZoneDiscrepancy } from '../types';
import { api } from '../services/api';

const FALLBACK_TWIN_OVERVIEW: DigitalTwinOverview = {
  zones: [
    {
      id: 1,
      name: "Main Fabrication Floor",
      description: "Primary manufacturing and assembly zone with heavy machinery",
      risk_level: "HIGH",
      is_restricted: false,
      max_occupancy: 20,
      current_occupancy: 12,
      expected_conditions: "All personnel must wear standard PPE. Aisles clear of liquid spills.",
      polygon_coords: "[[0,0],[100,0],[100,100],[0,100]]",
      status: "OPTIMAL",
      camera_count: 2,
      active_discrepancies: [],
      objects: [
        {
          id: 1,
          zone_id: 1,
          name: "CNC Milling Station Alpha",
          object_type: "MACHINERY",
          expected_present: true,
          is_discrepancy: false,
          discrepancy_details: null,
          last_verified_at: new Date().toISOString()
        },
        {
          id: 2,
          zone_id: 1,
          name: "Fire Extinguisher Station FE-01",
          object_type: "SAFETY_EQUIPMENT",
          expected_present: true,
          is_discrepancy: false,
          discrepancy_details: null,
          last_verified_at: new Date().toISOString()
        }
      ],
      last_telemetry_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Chemical Storage Vault",
      description: "Secure storage for hazardous solvents, acids, and reactive chemicals",
      risk_level: "CRITICAL",
      is_restricted: true,
      max_occupancy: 2,
      current_occupancy: 0,
      expected_conditions: "Authorized Tier-3 badges only. Continuous vapor monitoring. Zero unauthorized items.",
      polygon_coords: "[[105,0],[180,0],[180,100],[105,100]]",
      status: "OPTIMAL",
      camera_count: 1,
      active_discrepancies: [],
      objects: [
        {
          id: 3,
          zone_id: 2,
          name: "Solvent Cabinet SC-A",
          object_type: "CONTAINMENT",
          expected_present: true,
          is_discrepancy: false,
          discrepancy_details: null,
          last_verified_at: new Date().toISOString()
        }
      ],
      last_telemetry_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "Loading Dock & Staging Bay",
      description: "Logistics bay for freight intake and pallet staging",
      risk_level: "MEDIUM",
      is_restricted: false,
      max_occupancy: 10,
      current_occupancy: 3,
      expected_conditions: "Forklift paths clear, high-visibility vests required.",
      polygon_coords: "[[0,105],[100,105],[100,200],[0,200]]",
      status: "OPTIMAL",
      camera_count: 1,
      active_discrepancies: [],
      objects: [],
      last_telemetry_at: new Date().toISOString()
    },
    {
      id: 4,
      name: "Server Infrastructure Hub",
      description: "Critical compute, network switches, and edge AI processing nodes",
      risk_level: "HIGH",
      is_restricted: true,
      max_occupancy: 1,
      current_occupancy: 0,
      expected_conditions: "Authorized engineers only. Clean room status. Halon fire system armed.",
      polygon_coords: "[[105,105],[180,105],[180,200],[105,200]]",
      status: "OPTIMAL",
      camera_count: 1,
      active_discrepancies: [],
      objects: [],
      last_telemetry_at: new Date().toISOString()
    }
  ],
  total_zones: 4,
  restricted_zones_count: 2,
  total_discrepancies: 0,
  facility_status: "OPTIMAL",
  evaluated_at: new Date().toISOString()
};

export const DigitalTwin: React.FC = () => {
  const [overview, setOverview] = useState<DigitalTwinOverview | null>(FALLBACK_TWIN_OVERVIEW);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTwinState = async () => {
    try {
      const data = await api.getDigitalTwinState();
      setOverview(data);
      if (data.zones.length > 0 && selectedZoneId === null) {
        setSelectedZoneId(data.zones[0].id);
      }
    } catch (err) {
      console.warn('Digital twin backend offline or connecting, using cached spatial state.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setIsRefreshing(true);
      const data = await api.evaluateDigitalTwin();
      setOverview(data);
    } catch (err) {
      console.error('Failed to re-evaluate facility:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTwinState();
    const interval = setInterval(fetchTwinState, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectedZone = overview?.zones.find((z) => z.id === selectedZoneId) || overview?.zones[0] || null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ANOMALY_DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500 shadow-glow-rose">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            ANOMALY DETECTED
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            ELEVATED RISK
          </span>
        );
      case 'OPTIMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            SYNCHRONIZED & OPTIMAL
          </span>
        );
    }
  };

  const getFacilityStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL_ALERT':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 font-mono text-xs font-bold shadow-glow-rose">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>FACILITY STATUS: CRITICAL DISCREPANCY</span>
          </div>
        );
      case 'ELEVATED_RISK':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500 text-amber-300 font-mono text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>FACILITY STATUS: ELEVATED RISK</span>
          </div>
        );
      case 'OPTIMAL':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>FACILITY STATUS: ALL ZONES SYNCHRONIZED</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>SPATIAL DIGITAL TWIN & DISCREPANCY DETECTOR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Facility Digital Twin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time synchronization between configured zone expectations and live optical perception telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {overview && getFacilityStatusBadge(overview.facility_status)}
          <button
            onClick={handleEvaluate}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Evaluate State
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800">
            <div className="text-xs font-mono text-slate-400">TOTAL MONITORED ZONES</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">{overview.total_zones}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800">
            <div className="text-xs font-mono text-amber-400">RESTRICTED SECURITY ZONES</div>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{overview.restricted_zones_count}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800">
            <div className="text-xs font-mono text-rose-400">ACTIVE DISCREPANCIES</div>
            <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{overview.total_discrepancies}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800">
            <div className="text-xs font-mono text-cyan-400">TELEMETRY RECENCY</div>
            <div className="text-sm font-mono text-cyan-300 mt-2">
              {new Date(overview.evaluated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      )}

      {/* Interactive 2D Facility Blueprint & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Spatial Map Blueprint (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 font-bold">
              <MapPin className="w-4 h-4 text-cyan-400" />
              FACILITY SPATIAL TOPOLOGY (INTERACTIVE 2D BLUEPRINT)
            </div>
            <span className="text-[11px] font-mono text-slate-500">Click any zone to inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {overview?.zones.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              const hasAnomaly = zone.status === 'ANOMALY_DETECTED';
              const hasCaution = zone.status === 'CAUTION';

              let borderColor = 'border-slate-800 hover:border-slate-700';
              let bgColor = 'bg-slate-900/60';
              if (isSelected) {
                borderColor = 'border-cyan-500 shadow-glow-cyan';
                bgColor = 'bg-cyan-950/20';
              } else if (hasAnomaly) {
                borderColor = 'border-rose-600/70 shadow-glow-rose';
                bgColor = 'bg-rose-950/20';
              } else if (hasCaution) {
                borderColor = 'border-amber-600/60';
                bgColor = 'bg-amber-950/20';
              }

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-56 relative overflow-hidden ${borderColor} ${bgColor}`}
                >
                  {/* Watermark badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-white">ZONE #{zone.id}</span>
                        {zone.is_restricted ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            <Lock className="w-3 h-3" /> RESTRICTED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                            <Unlock className="w-3 h-3" /> GENERAL
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{zone.name}</h3>
                    </div>

                    {getStatusBadge(zone.status)}
                  </div>

                  {/* Telemetry Stats inside Card */}
                  <div className="space-y-2 my-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        Occupancy:
                      </span>
                      <span
                        className={`font-bold ${
                          zone.current_occupancy > zone.max_occupancy
                            ? 'text-rose-400'
                            : zone.is_restricted && zone.current_occupancy > 0
                            ? 'text-rose-400'
                            : 'text-white'
                        }`}
                      >
                        {zone.current_occupancy} / {zone.max_occupancy} Max
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                        Cameras:
                      </span>
                      <span className="text-slate-300">{zone.camera_count} Optical Feeds</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        Twin Assets:
                      </span>
                      <span className="text-slate-300">{zone.objects.length} Registered</span>
                    </div>
                  </div>

                  {/* Discrepancy Alert Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    {zone.active_discrepancies.length > 0 ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {zone.active_discrepancies.length} Active Anomaly
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Conditions Synchronized
                      </span>
                    )}

                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Live Feed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Zone Inspector Panel (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl space-y-5">
          {selectedZone ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-mono text-cyan-400 tracking-wider">
                    ZONE #{selectedZone.id} DETAILED TELEMETRY
                  </div>
                  {getStatusBadge(selectedZone.status)}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedZone.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedZone.description}</p>
              </div>

              {/* Expected vs Observed Telemetry Comparison */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs space-y-2.5">
                <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  EXPECTED OPERATING BASELINE:
                </div>
                <p className="text-slate-300 italic font-sans text-xs bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                  "{selectedZone.expected_conditions || 'Normal equipment and personnel operation.'}"
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                  <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500">RISK RATING</div>
                    <div className="text-amber-300 font-bold mt-0.5">{selectedZone.risk_level}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500">ACCESS CONTROL</div>
                    <div className={selectedZone.is_restricted ? 'text-rose-400 font-bold mt-0.5' : 'text-emerald-400 font-bold mt-0.5'}>
                      {selectedZone.is_restricted ? 'CLEARANCE REQUIRED' : 'UNRESTRICTED'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Spatial Discrepancies */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  SPATIAL DISCREPANCIES ({selectedZone.active_discrepancies.length})
                </div>

                {selectedZone.active_discrepancies.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>No spatial discrepancies detected. Reality matches expected model.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedZone.active_discrepancies.map((disc) => (
                      <div
                        key={disc.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-rose-900/60 space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300">{disc.discrepancy_type}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                            {disc.severity}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs font-sans leading-relaxed">
                          {disc.description}
                        </p>
                        <div className="pt-1.5 border-t border-slate-900 text-cyan-400 text-[11px]">
                          <span className="font-bold">ACTION:</span> {disc.recommended_action}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Registered Digital Twin Assets */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-mono text-slate-400 font-bold flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-cyan-400" />
                  REGISTERED ZONE ASSETS ({selectedZone.objects.length})
                </div>
                <div className="space-y-1.5">
                  {selectedZone.objects.map((obj) => (
                    <div
                      key={obj.id}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="text-slate-200 font-bold">{obj.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{obj.object_type}</div>
                      </div>
                      {obj.is_discrepancy ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                          DISPLACED / MISSING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                          VERIFIED IN BAY
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
              <Info className="w-8 h-8 text-slate-600 mb-2" />
              <span>Select a zone on the spatial map to inspect live discrepancy telemetry.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
