import { motion } from 'framer-motion';
import { Activity, Heart, TrendingUp, Users, Award, Brain, Trophy, LogOut } from 'lucide-react';
import { getStreak, getXPLevel } from '../utils/helpers';

const tabs = [
  { id: 'profile',   label: 'My Profile', icon: Users },
  { id: 'dashboard', label: 'Dashboard',  icon: Activity },
  { id: 'chat',      label: 'AI Coach',   icon: Brain },
  { id: 'log',       label: 'Daily Log',  icon: TrendingUp },
  { id: 'report',    label: 'Report',     icon: Award },
  { id: 'friends',   label: 'Compete',    icon: Trophy },
];

export default function Sidebar({ activeTab, setActiveTab, profile, logs, challengeDone, status, onInit, currentUser, onLogout }) {
  const bmi = profile?.bmi;
  const streak = getStreak(logs);
  const { xp, level } = getXPLevel(logs, challengeDone);

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="glass-strong"
      style={{ width: 240, minWidth: 240, height: '100%', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Logo + User */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={18} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>HealthAI</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name || 'Personal Coach'}
            </div>
          </div>
          <button onClick={onLogout} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, flexShrink: 0 }}>
            <LogOut size={14} />
          </button>
        </div>

        {/* XP Level Badge */}
        <div style={{ background: `${level.color}15`, border: `1px solid ${level.color}40`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: level.color }}>{level.emoji} {level.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{xp} XP</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${getXPLevel(logs, challengeDone).progress}%` }} transition={{ duration: 1 }}
              style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${level.color}, ${level.color}88)` }} />
          </div>
        </div>
      </div>

      {/* AI Status */}
      <div className="glass" style={{ borderRadius: 10, padding: '8px 12px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: status.ready ? 0 : 8 }}>
          <div className="pulse-dot" style={{ background: status.ready ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: status.ready ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
            {status.ready ? `AI Ready · ${status.guides_loaded} guides` : 'AI Not Initialized'}
          </span>
        </div>
        {!status.ready && (
          <button className="btn-primary" style={{ width: '100%', fontSize: 11, padding: '6px 10px' }} onClick={onInit}>
            Initialize AI
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} />
              {tab.label}
              {tab.id === 'friends' && <span style={{ marginLeft: 'auto', fontSize: 9, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
            </button>
          );
        })}
      </nav>

      {/* Quick Stats */}
      {profile?.name && (
        <div className="glass" style={{ borderRadius: 10, padding: '10px 12px', marginTop: 12 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 1 }}>QUICK STATS</div>
          {[
            { label: '⚖️ BMI',    value: bmi || 'N/A' },
            { label: '🎯 Goal',   value: profile.goal ? profile.goal.split(' ').slice(0,2).join(' ') : 'N/A' },
            { label: '🔥 Streak', value: `${streak} days` },
            { label: '📊 Logs',   value: logs.length },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Wearable */}
      <div className="glass" style={{ borderRadius: 10, padding: '8px 12px', marginTop: 10 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, letterSpacing: 1 }}>WEARABLE SYNC</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
          {['⌚ Fitbit', '🍎 Apple'].map(w => (
            <div key={w} style={{ flex: 1, padding: '5px 6px', borderRadius: 7, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Mock · 8,432 steps today</div>
      </div>
    </motion.div>
  );
}
