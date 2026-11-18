import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ProfileTab from './pages/ProfileTab';
import DashboardTab from './pages/DashboardTab';
import ChatTab from './pages/ChatTab';
import LogTab from './pages/LogTab';
import ReportTab from './pages/ReportTab';
import FriendsTab from './pages/FriendsTab';
import { checkHealth, checkStatus, initializeKB } from './utils/api';
import { loadUserData, saveUserData } from './utils/helpers';
import toast from 'react-hot-toast';

const DEFAULT_PROFILE = {
  name: '', age: '', gender: '', weight: '', height: '', bmi: null,
  blood_pressure: '', heart_rate: '', blood_sugar: '', cholesterol: '',
  fitness_level: '', activity_level: '', sleep_hours: '', stress_level: '',
  water_intake: '', smoking: '', alcohol: '',
  goal: '', conditions: '', medications: '', dietary_restrictions: ''
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('healthai_session')); } catch { return null; }
  });

  const userId = currentUser?.id || null;

  const [profile, setProfile] = useState(() => userId ? loadUserData(userId, 'profile', { ...DEFAULT_PROFILE }) : { ...DEFAULT_PROFILE });
  const [logs, setLogs] = useState(() => userId ? loadUserData(userId, 'logs', []) : []);
  const [challengeDone, setChallengeDone] = useState(() => userId ? loadUserData(userId, 'challengeDone', {}) : {});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState({ ready: false, guides_loaded: 0 });
  const [backendOnline, setBackendOnline] = useState(false);

  // Check backend on mount
  useEffect(() => {
    checkHealth()
      .then(() => { setBackendOnline(true); return checkStatus(); })
      .then(res => setStatus(res.data))
      .catch(() => setBackendOnline(false));
  }, []);

  // Reload user data when user changes
  useEffect(() => {
    if (!userId) return;
    setProfile(loadUserData(userId, 'profile', { ...DEFAULT_PROFILE }));
    setLogs(loadUserData(userId, 'logs', []));
    setChallengeDone(loadUserData(userId, 'challengeDone', {}));
  }, [userId]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('healthai_session', JSON.stringify(user));
    setProfile(loadUserData(user.id, 'profile', { ...DEFAULT_PROFILE }));
    setLogs(loadUserData(user.id, 'logs', []));
    setChallengeDone(loadUserData(user.id, 'challengeDone', {}));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('healthai_session');
    setProfile({ ...DEFAULT_PROFILE });
    setLogs([]);
    setChallengeDone({});
  };

  const handleInit = async () => {
    const t = toast.loading('Loading 20 health guides into AI...');
    try {
      const res = await initializeKB();
      setStatus({ ready: true, guides_loaded: res.data.guides_loaded });
      toast.success(`${res.data.guides_loaded} guides loaded! ✅`, { id: t });
    } catch {
      toast.error('Initialization failed. Check backend.', { id: t });
    }
  };

  if (!currentUser) {
    return (
      <>
        <AuthScreen onLogin={handleLogin} />
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a2e', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 } }} />
      </>
    );
  }

  const tabProps = { profile, setProfile: (p) => { setProfile(p); saveUserData(userId, 'profile', p); }, logs, setLogs, challengeDone, setChallengeDone, userId, currentUser };

  const TABS = {
    profile:   <ProfileTab   {...tabProps} />,
    dashboard: <DashboardTab profile={profile} logs={logs} />,
    chat:      <ChatTab      profile={profile} logs={logs} currentUser={currentUser} />,
    log:       <LogTab       logs={logs} setLogs={tabProps.setLogs} challengeDone={challengeDone} setChallengeDone={tabProps.setChallengeDone} userId={userId} />,
    report:    <ReportTab    profile={profile} logs={logs} />,
    friends:   <FriendsTab   currentUser={currentUser} userId={userId} logs={logs} challengeDone={challengeDone} />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0a0a0f' }}>
      {/* Background Orbs */}
      <div className="floating-orb" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.07)', top: '-100px', left: '-100px', animationDuration: '10s' }} />
      <div className="floating-orb" style={{ width: 300, height: 300, background: 'rgba(139,92,246,0.05)', bottom: 0, right: '200px', animationDuration: '14s', animationDelay: '3s' }} />
      <div className="floating-orb" style={{ width: 250, height: 250, background: 'rgba(16,185,129,0.04)', top: '40%', right: '-50px', animationDuration: '12s', animationDelay: '6s' }} />

      {/* Backend Banner */}
      {!backendOnline && (
        <motion.div initial={{ y: -40 }} animate={{ y: 0 }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(10px)',
          padding: '7px 20px', textAlign: 'center', fontSize: 12, color: 'white', fontWeight: 500
        }}>
          ⚠️ Backend offline — run: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>cd backend && uvicorn app.main:app --port 8080</code>
        </motion.div>
      )}

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, marginTop: !backendOnline ? 34 : 0 }}>
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          profile={profile} logs={logs} challengeDone={challengeDone}
          status={status} onInit={handleInit}
          currentUser={currentUser} onLogout={handleLogout}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, marginTop: !backendOnline ? 34 : 0, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: activeTab === 'chat' ? '100%' : 'auto' }}
          >
            {TABS[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>

      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a2e', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 },
        success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
      }} />
    </div>
  );
}
