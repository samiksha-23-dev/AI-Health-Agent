import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle, Circle, Trash2, Camera } from 'lucide-react';
import { getXPLevel, getStreak, triggerConfetti, saveUserData } from '../utils/helpers';
import toast from 'react-hot-toast';

const CHALLENGE_DAYS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  task: [
    '10 min morning walk', '20 push-ups', '15 min yoga', '30 min cardio',
    '5 min meditation', '20 squats', '10 min stretching', '25 min run',
    '15 min HIIT', '30 min strength training'
  ][i % 10]
}));

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  weight: '', water: '', sleep: '', energy: '7',
  workout_done: false, diet_followed: false, mood: '😊', notes: '',
  calories: '', steps: ''
};

export default function LogTab({ logs, setLogs, challengeDone, setChallengeDone, userId }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [photo, setPhoto] = useState(null);
  const [showChallenge, setShowChallenge] = useState(false);

  const { xp, level, progress } = getXPLevel(logs, challengeDone);
  const streak = getStreak(logs);
  const completedChallenges = Object.values(challengeDone).filter(Boolean).length;

  const saveLog = () => {
    if (!form.date) return toast.error('Please select a date');
    const newLog = { ...form, id: Date.now() };
    const updated = [...logs, newLog];
    setLogs(updated);
    saveUserData(userId, 'logs', updated);
    triggerConfetti();
    toast.success('Log saved! +50 XP 🎉');
    setForm({ ...EMPTY_FORM });
    setPhoto(null);
  };

  const deleteLog = (id) => {
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    saveUserData(userId, 'logs', updated);
    toast.success('Log deleted');
  };

  const toggleChallenge = (day) => {
    const updated = { ...challengeDone, [day]: !challengeDone[day] };
    setChallengeDone(updated);
    saveUserData(userId, 'challengeDone', updated);
    if (!challengeDone[day]) {
      toast.success(`Day ${day} complete! +40 XP 💪`);
      triggerConfetti();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '22px', maxWidth: 1020, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px' }}>Daily Log & Tracking</h1>

      {/* Gamification Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass"
        style={{ borderRadius: 16, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontSize: 30 }}>{level.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: level.color }}>{level.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{xp} XP</span>
          </div>
          <div className="xp-bar">
            <motion.div className="xp-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              style={{ background: `linear-gradient(90deg, ${level.color}, ${level.color}88)` }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
            Logs +50 · Workout +30 · Diet +20 · Challenge +40 XP each
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { val: `🔥 ${streak}`, label: 'Streak', color: '#f59e0b' },
            { val: logs.length,    label: 'Logs',   color: '#10b981' },
            { val: completedChallenges, label: 'Challenges', color: '#6366f1' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Log Form */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>📝 Today's Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[
                { key: 'date',     label: 'Date',        type: 'date' },
                { key: 'weight',   label: 'Weight (kg)', type: 'number', placeholder: '70' },
                { key: 'water',    label: 'Water (L)',   type: 'number', placeholder: '2.5' },
                { key: 'sleep',    label: 'Sleep (hrs)', type: 'number', placeholder: '7' },
                { key: 'calories', label: 'Calories',    type: 'number', placeholder: '2000' },
                { key: 'steps',    label: 'Steps',       type: 'number', placeholder: '8000' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                  <input className="input-field" type={f.type} placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 13 }} />
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>
                Energy Level: <span style={{ color: '#6366f1', fontWeight: 700 }}>{form.energy}/10</span>
              </label>
              <input type="range" min="1" max="10" value={form.energy}
                onChange={e => setForm(p => ({ ...p, energy: e.target.value }))}
                style={{ width: '100%', accentColor: '#6366f1' }} />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>Mood</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['😴','😐','😊','😄','🤩'].map(m => (
                  <button key={m} onClick={() => setForm(p => ({ ...p, mood: m }))} style={{
                    flex: 1, padding: '7px', borderRadius: 8, fontSize: 18, cursor: 'pointer',
                    border: `1px solid ${form.mood === m ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                    background: form.mood === m ? 'rgba(99,102,241,0.2)' : 'transparent',
                    transition: 'all 0.2s'
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              {[
                { key: 'workout_done',   label: '💪 Workout Done',  activeColor: '#10b981' },
                { key: 'diet_followed',  label: '🥗 Diet Followed', activeColor: '#10b981' },
              ].map(item => (
                <button key={item.key} onClick={() => setForm(p => ({ ...p, [item.key]: !p[item.key] }))} style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  border: `1px solid ${form[item.key] ? item.activeColor : 'rgba(255,255,255,0.1)'}`,
                  background: form[item.key] ? `${item.activeColor}18` : 'transparent',
                  color: form[item.key] ? item.activeColor : 'rgba(255,255,255,0.45)'
                }}>{item.label}</button>
              ))}
            </div>

            <textarea className="input-field" placeholder="Notes, symptoms, observations..." value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ resize: 'none', fontSize: 13 }} />

            {/* Progress Photo */}
            <div style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <Camera size={18} color="rgba(255,255,255,0.25)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Add Progress Photo</span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files[0]) { setPhoto(URL.createObjectURL(e.target.files[0])); toast.success('Photo added! 📸'); } }} />
              </label>
              {photo && <img src={photo} alt="progress" style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 110, objectFit: 'cover' }} />}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-success" onClick={saveLog}
              style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
              <Plus size={15} /> Save Log (+50 XP)
            </motion.button>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 30-Day Challenge */}
          <div className="glass" style={{ borderRadius: 16, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>🏆 30-Day Challenge</div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>{completedChallenges}/30</div>
            </div>
            <div className="progress-bar" style={{ marginBottom: 10 }}>
              <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${(completedChallenges / 30) * 100}%` }}
                style={{ background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
            </div>
            <button onClick={() => setShowChallenge(!showChallenge)}
              style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showChallenge ? '▲ Hide' : '▼ Show'} challenge days
            </button>
            <AnimatePresence>
              {showChallenge && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                    {CHALLENGE_DAYS.map(({ day, task }) => (
                      <div key={day} className={`challenge-item ${challengeDone[day] ? 'done' : ''}`}
                        onClick={() => toggleChallenge(day)} style={{ cursor: 'pointer' }}>
                        {challengeDone[day]
                          ? <CheckCircle size={13} color="#10b981" />
                          : <Circle size={13} color="rgba(255,255,255,0.25)" />}
                        <span style={{ fontSize: 11, color: challengeDone[day] ? '#10b981' : 'rgba(255,255,255,0.55)' }}>
                          Day {day}: {task}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Logs */}
          <div className="glass" style={{ borderRadius: 16, padding: '14px', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 10 }}>📋 Recent Logs</div>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, padding: '20px 0' }}>
                No logs yet. Start tracking today!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 320, overflowY: 'auto' }}>
                {[...logs].reverse().map(log => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{log.date} {log.mood}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {log.weight && `⚖️${log.weight}kg `}
                        {log.sleep && `😴${log.sleep}h `}
                        {log.water && `💧${log.water}L `}
                        {log.calories && `🔥${log.calories}cal `}
                        {log.steps && `👟${parseInt(log.steps).toLocaleString()} `}
                        {log.workout_done && '💪 '}
                        {log.diet_followed && '🥗'}
                      </div>
                    </div>
                    <button onClick={() => deleteLog(log.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4 }}>
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
