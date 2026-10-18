import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  Layers, 
  SlidersHorizontal, 
  History,
  Settings,
  ChevronLeft,
  ChevronRight
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
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'vision', label: 'Live Vision', icon: Video },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badge: openIncidentsCount },
    { id: 'knowledge', label: 'Knowledge Base', icon: FileText },
    { id: 'ask', label: 'Ask NEXUS', icon: MessageSquare },
    { id: 'twin', label: 'Digital Twin', icon: Layers },
    { id: 'rules', label: 'Safety Rules', icon: SlidersHorizontal },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-white border-r border-slate-200 transition-all duration-200 flex flex-col justify-between select-none ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation Items */}
      <div className="p-2 space-y-0.5">
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-600 mb-1">
          {!collapsed && <span>Operations</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs transition relative font-medium ${
                isActive
                  ? 'bg-slate-100 text-slate-900 border-l-2 border-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${
                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              }`} />
              
              {!collapsed && (
                <span className="truncate text-left flex-1">{item.label}</span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded font-semibold ${
                  collapsed ? 'absolute top-1.5 right-1.5' : ''
                } bg-red-100 text-red-700 border border-red-200`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / System Specification */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {!collapsed ? (
          <div className="space-y-1 text-[11px] font-mono text-slate-600">
            <div className="flex justify-between items-center">
              <span>PLATFORM</span>
              <span className="text-slate-700 font-medium">NEXUS Core v1.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span>MODE</span>
              <span className="text-slate-700 font-medium">Multimodal RAG</span>
            </div>
          </div>
        ) : (
          <div className="text-center font-mono text-[10px] text-slate-600">v1.0</div>
        )}
      </div>
    </aside>
  );
};
