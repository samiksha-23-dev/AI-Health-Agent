import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Activity, Heart, Zap, Droplets, TrendingUp, Brain } from 'lucide-react';
import { getBMICategory } from '../utils/helpers';
import { sendMessage } from '../utils/api';
import toast from 'react-hot-toast';

const MetricCard = ({ icon: Icon, label, value, unit, color, sub }) => (
  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="metric-card" style={{ borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
          {value || '—'} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{unit}</span>
        </div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'white' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

export default function DashboardTab({ profile, logs }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const bmiInfo = getBMICategory(profile?.bmi);

  // Weight trend — use actual dates, filter valid entries
  const weightData = logs
    .filter(l => l.weight && parseFloat(l.weight) > 0)
    .slice(-14)
    .map(l => ({ date: l.date?.slice(5) || '', weight: parseFloat(l.weight) }));

  // Adherence
  const workoutDone = logs.filter(l => l.workout_done).length;
  const dietDone = logs.filter(l => l.diet_followed).length;
  const workoutPct = logs.length ? Math.round((workoutDone / logs.length) * 100) : 0;
  const dietPct = logs.length ? Math.round((dietDone / logs.length) * 100) : 0;

  // Calorie data from logs (last 7 days)
  const calorieLogs = logs.filter(l => l.calories && parseFloat(l.calories) > 0).slice(-7);
  const calorieChartData = calorieLogs.map(l => ({ date: l.date?.slice(5) || '', calories: parseFloat(l.calories) }));

  // Macro split — dynamic based on goal
  const goal = profile?.goal || '';
  const macros = goal.includes('Muscle') ? [{ name: 'Protein', value: 35, color: '#6366f1' }, { name: 'Carbs', value: 45, color: '#10b981' }, { name: 'Fats', value: 20, color: '#f59e0b' }]
    : goal.includes('Weight Loss') ? [{ name: 'Protein', value: 40, color: '#6366f1' }, { name: 'Carbs', value: 30, color: '#10b981' }, { name: 'Fats', value: 30, color: '#f59e0b' }]
    : [{ name: 'Protein', value: 30, color: '#6366f1' }, { name: 'Carbs', value: 45, color: '#10b981' }, { name: 'Fats', value: 25, color: '#f59e0b' }];

  const runAnalysis = async () => {
    if (!profile?.name) return toast.error('Please complete your profile first');
    setLoading(true);
    setAnalysis('');
    try {
      const res = await sendMessage({ message: 'Perform a comprehensive health analysis of my metrics', mode: 'health_analysis', profile, logs });
      setAnalysis(res.data.response);
    } catch {
      toast.error('Analysis failed. Check backend connection.');
    }
    setLoading(false);
  };

  const formatAI = (text) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^- (.*$)/gm, '• $1<br/>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
            {profile?.name ? `Welcome back, ${profile.name.split(' ')[0]}! 👋` : 'Health Dashboard'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 3 }}>Your health at a glance</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary" onClick={runAnalysis} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={15} /> {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </motion.button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <MetricCard icon={Activity}   label="BMI"            value={profile?.bmi}            unit=""       color={bmiInfo.color} sub={bmiInfo.label} />
        <MetricCard icon={Heart}      label="Blood Pressure" value={profile?.blood_pressure}  unit="mmHg"   color="#ef4444" />
        <MetricCard icon={Zap}        label="Heart Rate"     value={profile?.heart_rate}      unit="bpm"    color="#f59e0b" />
        <MetricCard icon={TrendingUp} label="Blood Sugar"    value={profile?.blood_sugar}     unit="mg/dL"  color="#10b981" />
        <MetricCard icon={Droplets}   label="Cholesterol"    value={profile?.cholesterol}     unit="mg/dL"  color="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Weight Trend */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>📈 Weight Trend</div>
          {weightData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Weight (kg)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, gap: 8 }}>
              <TrendingUp size={32} color="rgba(255,255,255,0.1)" />
              Log your weight daily to see trends
            </div>
          )}
        </div>

        {/* Macro Split */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>🥗 Macro Split</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Based on your goal: {goal || 'General'}</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={macros} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                {macros.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {macros.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{d.name} {d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calorie Chart + Adherence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Calorie Bar Chart */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>🔥 Calorie Intake (Last 7 Days)</div>
          {calorieChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={calorieChartData}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="calories" fill="#6366f1" radius={[4, 4, 0, 0]} name="Calories" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              Log calories in Daily Log to see chart
            </div>
          )}
        </div>

        {/* Adherence */}
        <div className="glass" style={{ borderRadius: 16, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 16 }}>📊 Adherence Tracking</div>
          {logs.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>Start logging to track adherence</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: '💪 Workout Adherence', value: workoutPct, color: '#6366f1', count: `${workoutDone}/${logs.length} days` },
                { label: '🥗 Diet Adherence',    value: dietPct,    color: '#10b981', count: `${dietDone}/${logs.length} days` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({item.count})</span></span>
                  </div>
                  <div className="progress-bar">
                    <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1 }}
                      style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}99)` }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { label: 'Avg Sleep', value: logs.filter(l=>l.sleep).length ? (logs.filter(l=>l.sleep).reduce((a,l)=>a+parseFloat(l.sleep||0),0)/logs.filter(l=>l.sleep).length).toFixed(1)+'h' : 'N/A', color: '#8b5cf6' },
                  { label: 'Avg Water', value: logs.filter(l=>l.water).length ? (logs.filter(l=>l.water).reduce((a,l)=>a+parseFloat(l.water||0),0)/logs.filter(l=>l.water).length).toFixed(1)+'L' : 'N/A', color: '#3b82f6' },
                  { label: 'Avg Steps', value: logs.filter(l=>l.steps).length ? Math.round(logs.filter(l=>l.steps).reduce((a,l)=>a+parseFloat(l.steps||0),0)/logs.filter(l=>l.steps).length).toLocaleString() : 'N/A', color: '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {loading && (
        <div className="glass" style={{ borderRadius: 16, padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>AI is analyzing your health metrics...</div>
        </div>
      )}
      {analysis && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ borderRadius: 16, padding: '22px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 12 }}>🤖 AI Health Analysis</div>
          <div className="ai-response" style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.8)' }}
            dangerouslySetInnerHTML={{ __html: formatAI(analysis) }} />
        </motion.div>
      )}
    </motion.div>
  );
}
