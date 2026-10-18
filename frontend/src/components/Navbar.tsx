import React from 'react';
import { Shield, Radio, Cpu, User as UserIcon, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { SystemStatus, User } from '../types';

interface NavbarProps {
  systemStatus: SystemStatus | null;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  currentUser,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0a0f1d]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center shadow-glow-cyan">
          <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg tracking-wider text-slate-100">NEXUS</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">See. Remember. Protect.</p>
        </div>
      </div>

      {/* Center: Live Telemetry Indicators */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              systemStatus?.critical_alerts ? 'bg-rose-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              systemStatus?.critical_alerts ? 'bg-rose-500' : 'bg-emerald-500'
            }`}></span>
          </span>
          <span className="text-slate-400">CORE STATUS:</span>
          <span className={`font-semibold ${
            systemStatus?.critical_alerts ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {systemStatus?.status || 'OPTIMAL'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">CAMERAS:</span>
          <span className="text-cyan-300 font-bold">{systemStatus?.active_cameras ?? 4} ONLINE</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-400">MODEL:</span>
          <span className="text-violet-300 uppercase">{systemStatus?.llm_provider || 'LOCAL GROUNDED'}</span>
        </div>

        {systemStatus?.demo_mode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 text-[11px]">
            <AlertCircle className="w-3 h-3" />
            <span>DEMO STREAM ACTIVE</span>
          </div>
        )}
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{currentUser.full_name || currentUser.username}</div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{currentUser.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-glow-cyan transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>AUTHENTICATE</span>
          </button>
        )}
      </div>
    </header>
  );
};
