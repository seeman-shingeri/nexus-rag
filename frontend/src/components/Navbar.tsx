import React from 'react';
import { 
  Shield, 
  Video, 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { SystemStatus, User, ActiveScreen } from '../types';

interface NavbarProps {
  systemStatus: SystemStatus | null;
  currentUser: User | null;
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  currentUser,
  activeScreen,
  onNavigate,
  onOpenLogin,
  onLogout,
}) => {
  const getScreenBreadcrumb = () => {
    switch (activeScreen) {
      case 'dashboard':
        return 'Overview';
      case 'vision':
        return 'Live Vision';
      case 'incidents':
        return 'Incidents';
      case 'knowledge':
        return 'Knowledge Base';
      case 'ask':
        return 'Ask NEXUS';
      case 'twin':
        return 'Digital Twin';
      case 'rules':
        return 'Safety Rules';
      case 'audit':
        return 'Audit Log';
      case 'settings':
        return 'Settings';
      default:
        return 'Overview';
    }
  };

  const isConnected = systemStatus !== null;
  const openIncidents = systemStatus?.open_incidents ?? 0;

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-sm tracking-tight text-slate-900">NEXUS</span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-600 uppercase tracking-wider">
              Safety Intelligence
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span>System</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">{getScreenBreadcrumb()}</span>
        </div>
      </div>

      {/* Center / Operational Health Indicators */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono">
        {/* Backend Connection Check */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-600' : 'bg-amber-600'
            }`}
          />
          <span className="text-slate-500">API:</span>
          <span className={`font-semibold ${isConnected ? 'text-slate-800' : 'text-amber-800'}`}>
            {isConnected ? 'VERIFIED CONNECTED' : 'CHECKING CONNECTION'}
          </span>
        </div>

        {/* Optical Feeds Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
          <Video className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">STREAMS:</span>
          <span className="text-slate-800 font-semibold">
            {systemStatus ? `${systemStatus.active_cameras} ONLINE` : 'INITIALIZING'}
          </span>
        </div>

        {/* Active Model Engine */}
        {systemStatus?.llm_provider && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
            <span className="text-slate-500">ENGINE:</span>
            <span className="text-slate-800 font-semibold">{systemStatus.llm_provider}</span>
          </div>
        )}
      </div>

      {/* Right / Controls & User Session */}
      <div className="flex items-center gap-2.5">
        {/* Discreet Notification Control */}
        <button
          onClick={() => onNavigate('incidents')}
          className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
          title={`${openIncidents} open incidents requiring attention`}
        >
          <Bell className="w-4 h-4" />
          {openIncidents > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* User Account / Auth */}
        {currentUser ? (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser.full_name || currentUser.username}
              </div>
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                {currentUser.role}
              </div>
            </div>
            <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
