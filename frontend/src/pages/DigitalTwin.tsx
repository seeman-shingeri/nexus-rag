import React from 'react';
import { Layers, MapPin, AlertCircle, Shield } from 'lucide-react';

export const DigitalTwin: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>SPATIAL DIGITAL TWIN</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Interactive Facility Zone Map</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizing monitored zones, expected equipment states, and anomaly discrepancies.
          </p>
        </div>
      </div>

      <div className="p-12 text-center rounded-2xl bg-[#0d1527] border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
        <div className="text-slate-200 font-bold">DIGITAL TWIN MAPPING READY</div>
        <p className="text-slate-500">Interactive 2D spatial canvas with live discrepancy detection will be activated in Milestone 8.</p>
      </div>
    </div>
  );
};
