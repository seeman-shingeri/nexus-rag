import React, { useState, useEffect } from 'react';
import { ActiveScreen, User, SystemStatus } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './pages/Dashboard';
import { LiveVision } from './pages/LiveVision';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { IncidentCenter } from './pages/IncidentCenter';
import { AskNexus } from './pages/AskNexus';
import { DigitalTwin } from './pages/DigitalTwin';
import { SafetyRules } from './pages/SafetyRules';
import { Settings } from './pages/Settings';

export function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('nexus_token');
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch {
          localStorage.removeItem('nexus_token');
        }
      }
    };

    const fetchStatus = async () => {
      try {
        const s = await api.getSystemStatus();
        setSystemStatus(s);
      } catch (err) {
        console.error('Failed to get system status:', err);
      }
    };

    checkAuth();
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    setCurrentUser(null);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveScreen} />;
      case 'vision':
        return <LiveVision />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'incidents':
        return <IncidentCenter />;
      case 'ask':
        return <AskNexus />;
      case 'twin':
        return <DigitalTwin />;
      case 'rules':
        return <SafetyRules />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans">
      <Navbar
        systemStatus={systemStatus}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          openIncidentsCount={systemStatus?.open_incidents}
        />

        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#070c18] via-[#091024] to-[#070c18]">
          <div className="max-w-7xl mx-auto">
            {renderScreen()}
          </div>
        </main>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}

export default App;
