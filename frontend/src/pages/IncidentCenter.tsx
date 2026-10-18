import React from 'react';
import { AlertTriangle, Filter, CheckCircle2, Search, UserCheck } from 'lucide-react';

export const IncidentCenter: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>INCIDENT MANAGEMENT LOG</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incident Center & Human Review</h1>
          <p className="text-sm text-slate-400 mt-1">
            Verified safety incidents with evidence snapshots, SOP procedures, and review workflows.
          </p>
        </div>
      </div>

      <div className="p-12 text-center rounded-2xl bg-[#0d1527] border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
        <div className="text-slate-200 font-bold">INCIDENT STORAGE READY</div>
        <p className="text-slate-500">Incident lifecycle (Acknowledge, Assign, Resolve, Reopen) will be linked in Milestone 6.</p>
      </div>
    </div>
  );
};
