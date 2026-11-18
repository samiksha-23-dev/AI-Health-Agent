import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Dumbbell, Apple, Flame, Play, Pause, RotateCcw } from 'lucide-react';
import { sendMessage } from '../utils/api';
import toast from 'react-hot-toast';

function WorkoutTimer() {
  const [duration, setDuration] = useState(30);
  const [equipment, setEquipment] = useState('Bodyweight');
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const toggle = () => {
    if (running) {
      clearInterval(intervalId);
      setRunning(false);
    } else {
      const id = setInterval(() => setTime(t => {
        if (t + 1 >= duration * 60) {
          clearInterval(id);
          setRunning(false);
          toast.success('Workout complete! 🎉');
          return duration * 60;
        }
        return t + 1;
      }), 1000);
      setIntervalId(id);
      setRunning(true);
    }
  };

  const reset = () => { clearInterval(intervalId); setTime(0); setRunning(false); };
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = duration > 0 ? Math.min((time / (duration * 60)) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>⏱️ Workout Timer</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Duration (min)</label>
          <input className="input-field" type="number" min="1" max="180" value={duration}
            onChange={e => { if (!running) { setDuration(parseInt(e.target.value) || 30); setTime(0); } }}
            style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Equipment</label>
          <select className="input-field" value={equipment} onChange={e => setEquipment(e.target.value)} style={{ fontSize: 13 }}>
            {['Bodyweight','Dumbbells','Barbell','Resistance Bands','Gym Full'].map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 130, height: 130 }}>
          <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle cx="65" cy="65" r="52" fill="none"
              stroke={pct >= 100 ? '#10b981' : '#6366f1'} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{fmt(time)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{Math.round(pct)}% done</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn-primary" onClick={toggle}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13 }}>
            {running ? <Pause size={14} /> : <Play size={14} />} {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTIONS = [
  { mode: 'workout_plan', label: 'Workout Plan', icon: Dumbbell, color: '#8b5cf6', desc: '7-day personalized exercise routine' },
  { mode: 'diet_plan',    label: 'Diet Plan',    icon: Apple,    color: '#10b981', desc: 'Complete nutrition & meal plan' },
  { mode: 'motivation',   label: 'Motivate Me',  icon: Flame,    color: '#f59e0b', desc: 'Personalized motivational boost' },
];

export default function ReportTab({ profile, logs }) {
  const [report, setReport] = useState('');
  const [reportLabel, setReportLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  const generate = async (mode, label) => {
    if (!profile?.name) return toast.error('Complete your profile first');
    setActiveAction(mode);
    setLoading(true);
    setReport('');
    setReportLabel(label);
    try {
      const res = await sendMessage({ message: `Generate ${label}`, mode, profile, logs });
      setReport(res.data.response);
    } catch {
      toast.error('Generation failed. Check backend connection.');
    }
    setLoading(false);
    setActiveAction(null);
  };

  const formatReport = (text) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^- (.*$)/gm, '• $1<br/>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '22px', maxWidth: 1020, margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 22px' }}>Reports & Plans</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Quick Actions */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>⚡ Quick Generate</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {ACTIONS.map(a => {
              const Icon = a.icon;
              const isActive = loading && activeAction === a.mode;
              return (
                <motion.button key={a.mode} whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.98 }}
                  onClick={() => generate(a.mode, a.label)} disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
                    borderRadius: 12, border: `1px solid ${a.color}30`, background: `${a.color}0d`,
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    opacity: loading && !isActive ? 0.5 : 1
                  }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isActive
                      ? <div style={{ width: 14, height: 14, border: `2px solid ${a.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : <Icon size={16} color={a.color} />}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{a.desc}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary"
              onClick={() => generate('health_report', 'Weekly Health Report')} disabled={loading}
              style={{ width: '100%', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
              {loading && activeAction === 'health_report'
                ? <><div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating...</>
                : <><FileText size={15} /> 📊 Generate Full Weekly Report</>}
            </motion.button>
          </div>
        </div>

        <WorkoutTimer />
      </div>

      {/* Loading state for report */}
      {loading && activeAction === 'health_report' && (
        <div className="glass" style={{ borderRadius: 16, padding: '28px', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 10 }}>
            {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s`, width: 10, height: 10 }} />)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Generating your comprehensive health report...</div>
        </div>
      )}

      {/* Report Output */}
      {report && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ borderRadius: 16, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>📋 {reportLabel}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard.writeText(report); toast.success('Copied to clipboard!'); }}
                style={{ fontSize: 11, color: '#6366f1', background: 'none', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
                Copy
              </button>
              <button onClick={() => setReport('')}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          </div>
          <div className="ai-response" style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.82)' }}
            dangerouslySetInnerHTML={{ __html: formatReport(report) }} />
        </motion.div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
