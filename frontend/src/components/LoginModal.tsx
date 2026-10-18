import React, { useState } from 'react';
import { Lock, User, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin@nexus.ai');
  const [password, setPassword] = useState('NexusAdmin@2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem('nexus_token', data.access_token);
      const user = await api.getMe();
      onLoginSuccess(user, data.access_token);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setRolePreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0d1527] border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wider">OPERATOR AUTHENTICATION</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Role Selector */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-mono text-slate-400">SELECT PRESET AUTHORIZATION ROLE:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRolePreset('admin@nexus.ai', 'NexusAdmin@2026')}
              className={`p-2 rounded-lg border text-left text-xs font-mono transition ${
                username === 'admin@nexus.ai'
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-glow-cyan'
                  : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold">ADMIN</div>
              <div className="text-[10px] text-slate-500">Full Access</div>
            </button>

            <button
              type="button"
              onClick={() => setRolePreset('officer@nexus.ai', 'OfficerSafety@2026')}
              className={`p-2 rounded-lg border text-left text-xs font-mono transition ${
                username === 'officer@nexus.ai'
                  ? 'border-violet-500 bg-violet-950/40 text-violet-300 shadow-glow-violet'
                  : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold">OFFICER</div>
              <div className="text-[10px] text-slate-500">Safety Triage</div>
            </button>

            <button
              type="button"
              onClick={() => setRolePreset('operator@nexus.ai', 'OperatorDuty@2026')}
              className={`p-2 rounded-lg border text-left text-xs font-mono transition ${
                username === 'operator@nexus.ai'
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold">OPERATOR</div>
              <div className="text-[10px] text-slate-500">View & Ack</div>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">USERNAME OR EMAIL</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">PASSWORD</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-bold tracking-wider shadow-glow-cyan transition flex items-center justify-center gap-2"
            >
              {loading ? <span>AUTHENTICATING...</span> : <span>SIGN IN TO NEXUS</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
