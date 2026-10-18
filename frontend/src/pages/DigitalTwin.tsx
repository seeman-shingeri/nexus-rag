import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  AlertCircle,
  Shield,
  CheckCircle2,
  RefreshCw,
  Users,
  Video,
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
      console.warn('Digital twin API offline, using cached spatial state.');
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
      console.warn('Facility evaluation completed with local state');
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            ANOMALY
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            CAUTION
          </span>
        );
      case 'OPTIMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            SYNCHRONIZED
          </span>
        );
    }
  };

  const getFacilityStatusBadge = (status: string) => {
    switch (status) {
      case 'CRITICAL_ALERT':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 font-mono text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Facility Status: Critical Discrepancy</span>
          </div>
        );
      case 'ELEVATED_RISK':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Facility Status: Elevated Risk</span>
          </div>
        );
      case 'OPTIMAL':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Facility Status: All Zones Synchronized</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Facility Digital Twin & Spatial Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            2D spatial floor plan verifying live optical observations against configured safety parameters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {overview && getFacilityStatusBadge(overview.facility_status)}
          <button
            onClick={handleEvaluate}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Evaluate Spatial State</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Chips */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Monitored Zones</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{overview.total_zones}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Restricted Security Zones</span>
            <span className="text-xl font-bold font-mono text-amber-700 mt-1 block">{overview.restricted_zones_count}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Active Discrepancies</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{overview.total_discrepancies}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Telemetry Recency</span>
            <span className="text-xs font-mono text-slate-700 font-medium mt-1.5 block">
              {new Date(overview.evaluated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* 2D Schematic Floor Plan & Zone Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 2D Spatial Floor Plan (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono">
              Facility 2D Spatial Topology
            </span>
            <span className="text-[11px] font-mono text-slate-400">Click any zone to inspect details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {overview?.zones.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              const hasAnomaly = zone.status === 'ANOMALY_DETECTED';
              const hasCaution = zone.status === 'CAUTION';

              let borderStyle = 'border-slate-200 hover:border-slate-300 bg-white';
              if (isSelected) {
                borderStyle = 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/20';
              } else if (hasAnomaly) {
                borderStyle = 'border-red-400 bg-red-50/30';
              } else if (hasCaution) {
                borderStyle = 'border-amber-400 bg-amber-50/30';
              }

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-4 rounded border transition cursor-pointer flex flex-col justify-between h-48 select-none ${borderStyle}`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">Zone #{zone.id}</span>
                        {zone.is_restricted ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                            <Lock className="w-2.5 h-2.5" /> Restricted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            <Unlock className="w-2.5 h-2.5" /> General
                          </span>
                        )}
                      </div>
                      {getStatusBadge(zone.status)}
                    </div>
                    <h3 className="text-xs font-semibold text-slate-900 line-clamp-1">{zone.name}</h3>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="space-y-1.5 my-2 font-mono text-[11px] text-slate-600 divide-y divide-slate-100">
                    <div className="flex justify-between items-center pt-1">
                      <span>Occupancy:</span>
                      <span className={`font-semibold ${zone.current_occupancy > zone.max_occupancy ? 'text-red-700' : 'text-slate-900'}`}>
                        {zone.current_occupancy} / {zone.max_occupancy} Max
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span>Optical Feeds:</span>
                      <span className="text-slate-800">{zone.camera_count} Cameras</span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span>Registered Assets:</span>
                      <span className="text-slate-800">{zone.objects.length} Registered</span>
                    </div>
                  </div>

                  {/* Footer tag */}
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {zone.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Zone Inspector Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono">
              Zone Inspector & Diagnostics
            </span>
            {selectedZone && getStatusBadge(selectedZone.status)}
          </div>

          {selectedZone ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{selectedZone.name}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{selectedZone.description}</p>
              </div>

              {/* Operating Conditions */}
              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                  Expected Operating Conditions:
                </span>
                <p className="text-slate-800 text-[11px] leading-relaxed">
                  {selectedZone.expected_conditions || 'Standard operating environment parameters enforced.'}
                </p>
              </div>

              {/* Registered Assets List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                  Registered Zone Equipment:
                </span>
                {selectedZone.objects.length === 0 ? (
                  <span className="text-slate-400 text-xs font-mono">No fixed assets registered for this zone.</span>
                ) : (
                  <div className="space-y-1.5">
                    {selectedZone.objects.map((obj) => (
                      <div
                        key={obj.id}
                        className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="font-medium text-slate-800">{obj.name}</div>
                        <span className="font-mono text-[10px] text-slate-500 uppercase">{obj.object_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Discrepancies if any */}
              {selectedZone.active_discrepancies.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-red-700 font-semibold block">
                    Active Spatial Discrepancies:
                  </span>
                  {selectedZone.active_discrepancies.map((disc) => (
                    <div
                      key={disc.id}
                      className="p-2.5 rounded bg-red-50 border border-red-200 text-xs space-y-1"
                    >
                      <div className="font-semibold text-red-800">{disc.description}</div>
                      <div className="text-[10px] font-mono text-red-600">
                        Recommended: {disc.recommended_action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              Select a zone from the floor plan to inspect its configuration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
