// Per-user localStorage helpers
export const userKey = (userId, key) => `healthai_${userId}_${key}`;

export const saveUserData = (userId, key, data) => {
  localStorage.setItem(userKey(userId, key), JSON.stringify(data));
};

export const loadUserData = (userId, key, fallback = null) => {
  try {
    const raw = localStorage.getItem(userKey(userId, key));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};

export const getAllUsers = () => {
  try { return JSON.parse(localStorage.getItem('healthai_users')) || []; } catch { return []; }
};

export const saveAllUsers = (users) => {
  localStorage.setItem('healthai_users', JSON.stringify(users));
};

export const calcBMI = (weight, height) => {
  if (!weight || !height) return null;
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
};

export const getBMICategory = (bmi) => {
  if (!bmi) return { label: 'N/A', color: '#6b7280' };
  const b = parseFloat(bmi);
  if (b < 18.5) return { label: 'Underweight', color: '#3b82f6' };
  if (b < 25) return { label: 'Normal', color: '#10b981' };
  if (b < 30) return { label: 'Overweight', color: '#f59e0b' };
  return { label: 'Obese', color: '#ef4444' };
};

export const getXPLevel = (logs, challengeDone = {}) => {
  const logXP = logs.length * 50;
  const workoutXP = logs.filter(l => l.workout_done).length * 30;
  const dietXP = logs.filter(l => l.diet_followed).length * 20;
  const challengeXP = Object.values(challengeDone).filter(Boolean).length * 40;
  const xp = logXP + workoutXP + dietXP + challengeXP;
  const levels = [
    { name: 'Rookie',   min: 0,    max: 300,      color: '#6b7280', emoji: '🌱' },
    { name: 'Bronze',   min: 300,  max: 800,      color: '#cd7f32', emoji: '🥉' },
    { name: 'Silver',   min: 800,  max: 1500,     color: '#9ca3af', emoji: '🥈' },
    { name: 'Gold',     min: 1500, max: 3000,     color: '#f59e0b', emoji: '🥇' },
    { name: 'Platinum', min: 3000, max: Infinity, color: '#8b5cf6', emoji: '💎' },
  ];
  const level = levels.find(l => xp >= l.min && xp < l.max) || levels[0];
  const progress = level.max === Infinity ? 100 : ((xp - level.min) / (level.max - level.min)) * 100;
  return { xp, level, progress: Math.min(progress, 100) };
};

export const getStreak = (logs) => {
  if (!logs.length) return 0;
  const dates = [...new Set(logs.map(l => l.date))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let expected = new Date();
  expected.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const logDate = new Date(d);
    logDate.setHours(0, 0, 0, 0);
    const diff = Math.round((expected - logDate) / (1000 * 60 * 60 * 24));
    if (diff <= 1) { streak++; expected = logDate; }
    else break;
  }
  return streak;
};

export const triggerConfetti = () => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 2 + 's';
    el.style.width = (Math.random() * 8 + 6) + 'px';
    el.style.height = (Math.random() * 8 + 6) + 'px';
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};
