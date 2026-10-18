import React from 'react';
import { ShieldCheck, Plus, Sliders, AlertTriangle } from 'lucide-react';

export const SafetyRules: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>DETERMINISTIC LOGIC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Deterministic Safety Rules Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure observation categories, confidence thresholds, persistence duration, and cooldown windows.
          </p>
        </div>
      </div>

      <div className="p-12 text-center rounded-2xl bg-[#0d1527] border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
        <div className="text-slate-200 font-bold">SAFETY RULE SPECIFICATIONS LOADED</div>
        <p className="text-slate-500">Interactive rule editor, threshold simulator, and cooldown tuning will be connected in Milestone 7.</p>
      </div>
    </div>
  );
};
