import React from 'react';
import { 
  Activity, 
  Camera, 
  BookOpen, 
  AlertTriangle, 
  MessageSquareCode, 
  Layers, 
  ShieldCheck, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface SidebarProps {
  activeScreen: ActiveScreen;
  onSelectScreen: (screen: ActiveScreen) => void;
  openIncidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onSelectScreen,
  openIncidentsCount = 0,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const navItems: { id: ActiveScreen; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: Activity },
    { id: 'vision', label: 'Live Vision', icon: Camera },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'incidents', label: 'Incident Center', icon: AlertTriangle, badge: openIncidentsCount },
    { id: 'ask', label: 'Ask NEXUS', icon: MessageSquareCode },
    { id: 'twin', label: 'Digital Twin', icon: Layers },
    { id: 'rules', label: 'Safety Rules', icon: ShieldCheck },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-[#0a0f1d] border-r border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          {!collapsed && <span>Operations Hub</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:text-slate-300 hover:bg-slate-800 rounded transition ml-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition group relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 text-cyan-300 border border-cyan-800/60 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition ${
                isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              
              {!collapsed && (
                <span className="truncate text-left flex-1">{item.label}</span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-[11px] font-mono rounded-full font-bold ${
                  collapsed ? 'absolute top-2 right-2' : ''
                } bg-rose-600 text-white animate-pulse`}>
                  {item.badge}
                </span>
              )}

              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Telemetry ping */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          {!collapsed && (
            <div className="flex justify-between w-full">
              <span>LATENCY</span>
              <span className="text-emerald-400 font-semibold">12 ms</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
