import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { getAllUsers, saveAllUsers } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);

  const handleRegister = () => {
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) {
      return toast.error('All fields are required');
    }
    const users = getAllUsers();
    if (users.find(u => u.username.toLowerCase() === form.username.toLowerCase())) {
      return toast.error('Username already taken');
    }
    const newUser = {
      id: Date.now().toString(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      name: form.name.trim(),
      createdAt: new Date().toISOString(),
    };
    saveAllUsers([...users, newUser]);
    toast.success(`Welcome, ${newUser.name}! 🎉`);
    onLogin(newUser);
  };

  const handleLogin = () => {
    if (!form.username.trim() || !form.password.trim()) {
      return toast.error('Enter username and password');
    }
    const users = getAllUsers();
    const user = users.find(
      u => u.username.toLowerCase() === form.username.toLowerCase() && u.password === form.password
    );
    if (!user) return toast.error('Invalid username or password');
    toast.success(`Welcome back, ${user.name}! 👋`);
    onLogin(user);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div className="floating-orb" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.08)', top: '-150px', left: '-150px' }} />
      <div className="floating-orb" style={{ width: 400, height: 400, background: 'rgba(139,92,246,0.06)', bottom: '-100px', right: '-100px', animationDelay: '4s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-strong"
        style={{ width: 420, borderRadius: 24, padding: '40px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
          }}>
            <Heart size={28} color="white" />
          </div>
          <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>HealthAI</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
            Your AI-powered personal health coach
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {[{ id: 'login', label: 'Sign In', icon: LogIn }, { id: 'register', label: 'Sign Up', icon: UserPlus }].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setMode(t.id)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: mode === t.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: mode === t.id ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.3s ease'
              }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'register' && (
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input className="input-field" placeholder="John Doe" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      style={{ paddingLeft: 36 }} />
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input className="input-field" placeholder="johndoe" value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                    style={{ paddingLeft: 36 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                    style={{ paddingLeft: 36, paddingRight: 40 }} />
                  <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn-primary"
                onClick={mode === 'login' ? handleLogin : handleRegister}
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {mode === 'login' ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Create Account</>}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Demo hint */}
        <div style={{ marginTop: 20, padding: '12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            New here? Create an account to get started.<br />
            Multiple users can register and compete on the leaderboard!
          </div>
        </div>
      </motion.div>
    </div>
  );
}
