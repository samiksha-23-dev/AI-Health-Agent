import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Swords, Plus, CheckCircle, Clock, Crown, Medal, Star } from 'lucide-react';
import { getAllUsers, loadUserData, getXPLevel, getStreak, triggerConfetti } from '../utils/helpers';
import toast from 'react-hot-toast';

const CHALLENGE_TEMPLATES = [
  { id: 'steps_7',    title: '10K Steps Challenge',    desc: 'Log 10,000+ steps for 7 days',    duration: 7,  xp: 500,  icon: '👟' },
  { id: 'workout_5',  title: '5-Day Workout Streak',   desc: 'Complete workouts 5 days in a row', duration: 5,  xp: 400,  icon: '💪' },
  { id: 'water_7',    title: 'Hydration Week',          desc: 'Log 2.5L+ water for 7 days',       duration: 7,  xp: 300,  icon: '💧' },
  { id: 'sleep_7',    title: 'Sleep Champion',          desc: 'Log 7+ hours sleep for 7 days',    duration: 7,  xp: 350,  icon: '😴' },
  { id: 'diet_7',     title: 'Clean Eating Week',       desc: 'Follow diet plan for 7 days',      duration: 7,  xp: 450,  icon: '🥗' },
  { id: 'log_14',     title: '14-Day Consistency',      desc: 'Log every day for 14 days',        duration: 14, xp: 700,  icon: '📊' },
];

function getRank(xp) {
  if (xp >= 3000) return { label: 'Platinum', color: '#8b5cf6', emoji: '💎' };
  if (xp >= 1500) return { label: 'Gold',     color: '#f59e0b', emoji: '🥇' };
  if (xp >= 800)  return { label: 'Silver',   color: '#9ca3af', emoji: '🥈' };
  if (xp >= 300)  return { label: 'Bronze',   color: '#cd7f32', emoji: '🥉' };
  return { label: 'Rookie', color: '#6b7280', emoji: '🌱' };
}

function evaluateChallenge(challengeId, logs) {
  const recent = logs.slice(-14);
  switch (challengeId) {
    case 'steps_7':   return recent.filter(l => parseFloat(l.steps || 0) >= 10000).length;
    case 'workout_5': return recent.filter(l => l.workout_done).length;
    case 'water_7':   return recent.filter(l => parseFloat(l.water || 0) >= 2.5).length;
    case 'sleep_7':   return recent.filter(l => parseFloat(l.sleep || 0) >= 7).length;
    case 'diet_7':    return recent.filter(l => l.diet_followed).length;
    case 'log_14':    return Math.min(logs.length, 14);
    default: return 0;
  }
}

export default function FriendsTab({ currentUser, userId, logs, challengeDone }) {
  const [allUsers, setAllUsers] = useState([]);
  const [sentChallenges, setSentChallenges] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`healthai_challenges_${userId}`)) || []; } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState('');

  useEffect(() => {
    const users = getAllUsers();
    const enriched = users.map(u => {
      const uLogs = loadUserData(u.id, 'logs', []);
      const uChallengeDone = loadUserData(u.id, 'challengeDone', {});
      const { xp, level } = getXPLevel(uLogs, uChallengeDone);
      const streak = getStreak(uLogs);
      const workoutDays = uLogs.filter(l => l.workout_done).length;
      const dietDays = uLogs.filter(l => l.diet_followed).length;
      return { ...u, xp, level, streak, totalLogs: uLogs.length, workoutDays, dietDays };
    });
    enriched.sort((a, b) => b.xp - a.xp);
    setAllUsers(enriched);
  }, []);

  const saveChallenges = (updated) => {
    setSentChallenges(updated);
    localStorage.setItem(`healthai_challenges_${userId}`, JSON.stringify(updated));
  };

  const sendChallenge = () => {
    if (!selectedTemplate) return toast.error('Select a challenge type');
    if (!selectedOpponent) return toast.error('Select an opponent');
    const template = CHALLENGE_TEMPLATES.find(t => t.id === selectedTemplate);
    const opponent = allUsers.find(u => u.id === selectedOpponent);
    const challenge = {
      id: Date.now(),
      templateId: selectedTemplate,
      title: template.title,
      icon: template.icon,
      xp: template.xp,
      duration: template.duration,
      opponentId: selectedOpponent,
      opponentName: opponent.name,
      sentAt: new Date().toISOString(),
      status: 'active',
    };
    saveChallenges([...sentChallenges, challenge]);
    toast.success(`Challenge sent to ${opponent.name}! 🥊`);
    triggerConfetti();
    setSelectedTemplate(null);
    setSelectedOpponent('');
  };

  const myData = allUsers.find(u => u.id === userId);
  const myRank = allUsers.findIndex(u => u.id === userId) + 1;
  const opponents = allUsers.filter(u => u.id !== userId);

  const tabs = [
    { id: 'leaderboard', label: '🏆 Leaderboard', icon: Trophy },
    { id: 'challenge',   label: '⚔️ Challenge',   icon: Swords },
    { id: 'active',      label: '🎯 My Challenges', icon: Star },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '22px', maxWidth: 1020, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Compete with Friends</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Challenge others, climb the leaderboard, earn XP</p>
      </div>

      {/* My Rank Card */}
      {myData && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass"
          style={{ borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, border: `1px solid ${myData.level.color}40` }}>
          <div style={{ fontSize: 36 }}>{myRank === 1 ? '👑' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Your Ranking: #{myRank} of {allUsers.length}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {myData.level.emoji} {myData.level.name} · {myData.xp} XP · 🔥 {myData.streak} day streak
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: myData.level.color }}>{myData.xp}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Total XP</div>
          </div>
        </motion.div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <motion.div key="lb" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {allUsers.length === 0 ? (
              <div className="glass" style={{ borderRadius: 16, padding: '40px', textAlign: 'center' }}>
                <Users size={40} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No other users yet. Share the app with friends!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allUsers.map((user, idx) => {
                  const rank = getRank(user.xp);
                  const isMe = user.id === userId;
                  return (
                    <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      className="glass"
                      style={{ borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, border: isMe ? `1px solid ${user.level.color}50` : '1px solid rgba(255,255,255,0.08)', background: isMe ? `${user.level.color}08` : undefined }}>
                      {/* Rank */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: idx < 3 ? 22 : 14, fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      {/* Avatar */}
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${user.level.color}, ${user.level.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{user.name}</span>
                          {isMe && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {rank.emoji} {rank.label} · 🔥 {user.streak} streak · 📊 {user.totalLogs} logs
                        </div>
                        {/* Mini XP bar */}
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: user.level.color, width: `${Math.min((user.xp / 3000) * 100, 100)}%`, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                        {[
                          { label: 'XP',       value: user.xp,          color: user.level.color },
                          { label: 'Workouts', value: user.workoutDays,  color: '#6366f1' },
                          { label: 'Diet',     value: user.dietDays,     color: '#10b981' },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* CHALLENGE */}
        {activeTab === 'challenge' && (
          <motion.div key="ch" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* Challenge Templates */}
              <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>⚔️ Choose Challenge Type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {CHALLENGE_TEMPLATES.map(t => (
                    <motion.div key={t.id} whileHover={{ x: 3 }} onClick={() => setSelectedTemplate(t.id)}
                      style={{ padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                        border: `1px solid ${selectedTemplate === t.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        background: selectedTemplate === t.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{t.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{t.title}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{t.desc}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>+{t.xp}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>XP reward</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Send Challenge */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>🎯 Select Opponent</div>
                  {opponents.length === 0 ? (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      No other users registered yet.<br />Share the app with friends!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {opponents.map(u => (
                        <div key={u.id} onClick={() => setSelectedOpponent(u.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                            border: `1px solid ${selectedOpponent === u.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                            background: selectedOpponent === u.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${u.level.color}, ${u.level.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{u.name}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{u.level.emoji} {u.level.name} · {u.xp} XP</div>
                          </div>
                          {selectedOpponent === u.id && <CheckCircle size={16} color="#6366f1" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTemplate && selectedOpponent && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass"
                    style={{ borderRadius: 16, padding: '16px', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Challenge Preview</div>
                    {(() => {
                      const t = CHALLENGE_TEMPLATES.find(x => x.id === selectedTemplate);
                      const opp = allUsers.find(u => u.id === selectedOpponent);
                      return (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>{t?.icon} {t?.title}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                            vs {opp?.name} · {t?.duration} days · +{t?.xp} XP
                          </div>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary"
                            onClick={sendChallenge} style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
                            <Swords size={14} /> Send Challenge!
                          </motion.button>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIVE CHALLENGES */}
        {activeTab === 'active' && (
          <motion.div key="ac" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {sentChallenges.length === 0 ? (
              <div className="glass" style={{ borderRadius: 16, padding: '40px', textAlign: 'center' }}>
                <Swords size={40} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No active challenges. Go challenge someone!</div>
                <button className="btn-primary" onClick={() => setActiveTab('challenge')} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Create Challenge
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sentChallenges.map(c => {
                  const template = CHALLENGE_TEMPLATES.find(t => t.id === c.templateId);
                  const myProgress = template ? evaluateChallenge(c.templateId, logs) : 0;
                  const target = template?.duration || 7;
                  const pct = Math.min((myProgress / target) * 100, 100);
                  const opponent = allUsers.find(u => u.id === c.opponentId);
                  const oppLogs = opponent ? loadUserData(c.opponentId, 'logs', []) : [];
                  const oppProgress = template ? evaluateChallenge(c.templateId, oppLogs) : 0;
                  const oppPct = Math.min((oppProgress / target) * 100, 100);
                  const winning = myProgress >= oppProgress;

                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="glass" style={{ borderRadius: 16, padding: '18px', border: `1px solid ${winning ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{c.icon} {c.title}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            vs {c.opponentName} · Started {new Date(c.sentAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: winning ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${winning ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
                          <span style={{ fontSize: 12 }}>{winning ? '🏆' : '⚔️'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: winning ? '#10b981' : '#ef4444' }}>{winning ? 'Winning' : 'Behind'}</span>
                        </div>
                      </div>

                      {/* Progress Comparison */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { name: currentUser?.name || 'You', progress: myProgress, pct, color: '#6366f1', isMe: true },
                          { name: c.opponentName, progress: oppProgress, pct: oppPct, color: '#ef4444', isMe: false },
                        ].map(p => (
                          <div key={p.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 12, color: p.isMe ? '#a5b4fc' : 'rgba(255,255,255,0.6)', fontWeight: p.isMe ? 700 : 400 }}>
                                {p.isMe ? '👤 ' : '🎯 '}{p.name}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.progress}/{target} days</span>
                            </div>
                            <div className="progress-bar">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 1 }}
                                style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${p.color}, ${p.color}88)` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                          {target - myProgress > 0 ? `${target - myProgress} days remaining` : 'Challenge complete!'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>+{c.xp} XP reward</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
