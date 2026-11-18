import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { calcBMI, getBMICategory, triggerConfetti, saveUserData } from '../utils/helpers';
import toast from 'react-hot-toast';

const FIELD_GROUPS = [
  {
    title: '👤 Basic Info',
    fields: [
      { key: 'name',   label: 'Full Name',      type: 'text',   placeholder: 'Your name' },
      { key: 'age',    label: 'Age',             type: 'number', placeholder: '25' },
      { key: 'gender', label: 'Gender',          type: 'select', options: ['Male','Female','Other'] },
      { key: 'weight', label: 'Weight (kg)',     type: 'number', placeholder: '70' },
      { key: 'height', label: 'Height (cm)',     type: 'number', placeholder: '175' },
    ]
  },
  {
    title: '❤️ Health Metrics',
    fields: [
      { key: 'blood_pressure', label: 'Blood Pressure',      type: 'text',   placeholder: '120/80' },
      { key: 'heart_rate',     label: 'Heart Rate (bpm)',    type: 'number', placeholder: '72' },
      { key: 'blood_sugar',    label: 'Blood Sugar (mg/dL)', type: 'number', placeholder: '95' },
      { key: 'cholesterol',    label: 'Cholesterol (mg/dL)', type: 'number', placeholder: '180' },
    ]
  },
  {
    title: '🏃 Lifestyle',
    fields: [
      { key: 'fitness_level',  label: 'Fitness Level',    type: 'select', options: ['Beginner','Intermediate','Advanced','Athlete'] },
      { key: 'activity_level', label: 'Activity Level',   type: 'select', options: ['Sedentary','Lightly Active','Moderately Active','Very Active','Extremely Active'] },
      { key: 'sleep_hours',    label: 'Sleep Hours',      type: 'number', placeholder: '7' },
      { key: 'stress_level',   label: 'Stress (1-10)',    type: 'number', placeholder: '5' },
      { key: 'water_intake',   label: 'Water Intake (L)', type: 'number', placeholder: '2.5' },
      { key: 'smoking',        label: 'Smoking',          type: 'select', options: ['No','Yes','Former'] },
      { key: 'alcohol',        label: 'Alcohol',          type: 'select', options: ['None','Occasional','Moderate','Heavy'] },
    ]
  },
  {
    title: '🎯 Goals & Medical',
    fields: [
      { key: 'goal',                 label: 'Primary Goal',         type: 'select', options: ['Weight Loss','Muscle Gain','Maintain Weight','Improve Fitness','Manage Health Condition','Increase Energy'] },
      { key: 'conditions',           label: 'Medical Conditions',   type: 'text',   placeholder: 'Diabetes, Hypertension...' },
      { key: 'medications',          label: 'Medications',          type: 'text',   placeholder: 'Metformin...' },
      { key: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'text',   placeholder: 'Vegetarian, Gluten-free...' },
    ]
  }
];

export default function ProfileTab({ profile, setProfile, userId }) {
  const [form, setForm] = useState({ ...profile });

  // Sync form when profile changes externally (e.g. user switch)
  useEffect(() => { setForm({ ...profile }); }, [profile]);

  const handleChange = (key, value) => {
    const updated = { ...form, [key]: value };
    if (key === 'weight' || key === 'height') {
      updated.bmi = calcBMI(
        key === 'weight' ? value : form.weight,
        key === 'height' ? value : form.height
      );
    }
    setForm(updated);
  };

  const handleSave = () => {
    const saved = { ...form };
    if (!saved.bmi) saved.bmi = calcBMI(saved.weight, saved.height);
    setProfile(saved);
    saveUserData(userId, 'profile', saved);
    triggerConfetti();
    toast.success('Profile saved! 🎉');
  };

  const bmi = form.bmi || calcBMI(form.weight, form.height);
  const bmiInfo = getBMICategory(bmi);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '24px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>My Health Profile</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 }}>Complete your profile for personalized AI coaching</p>
      </div>

      {/* Live BMI Card */}
      {bmi && (
        <motion.div
          key={bmi}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass"
          style={{ borderRadius: 16, padding: '18px 24px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 20, border: `1px solid ${bmiInfo.color}40` }}
        >
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: `${bmiInfo.color}18`, border: `3px solid ${bmiInfo.color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: bmiInfo.color }}>{bmi}</span>
            <span style={{ fontSize: 9, color: bmiInfo.color }}>BMI</span>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: bmiInfo.color }}>{bmiInfo.label}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              {form.weight && `${form.weight}kg`} {form.height && `· ${form.height}cm`} · Live calculation
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Healthy Range</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>18.5 – 24.9</div>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {FIELD_GROUPS.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08 }}
            className="glass" style={{ borderRadius: 16, padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {group.fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input-field" value={form[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}>
                      <option value="">Select...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" type={f.type} placeholder={f.placeholder} value={form[f.key] || ''}
                      onChange={e => handleChange(f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-success" onClick={handleSave}
        style={{ marginTop: 22, width: '100%', padding: '14px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Save size={18} /> Save Profile
      </motion.button>
    </motion.div>
  );
}
