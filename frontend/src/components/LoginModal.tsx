import React, { useState } from 'react';
import { Lock, User, AlertCircle, X, Shield } from 'lucide-react';
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
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-900">Operator Authentication</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-2">
              Select Preset Role:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRolePreset('admin@nexus.ai', 'NexusAdmin@2026')}
                className={`p-2.5 rounded border text-left text-xs transition ${
                  username === 'admin@nexus.ai'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-900">Admin</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => setRolePreset('officer@nexus.ai', 'OfficerSafety@2026')}
                className={`p-2.5 rounded border text-left text-xs transition ${
                  username === 'officer@nexus.ai'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-900">Officer</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Safety Triage</div>
              </button>

              <button
                type="button"
                onClick={() => setRolePreset('operator@nexus.ai', 'OperatorDuty@2026')}
                className={`p-2.5 rounded border text-left text-xs transition ${
                  username === 'operator@nexus.ai'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-900">Operator</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Review Only</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Username or Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition shadow-sm mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
