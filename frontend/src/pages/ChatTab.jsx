import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Bot, User, Dumbbell, Apple, Flame, TrendingUp, Brain, Trash2, Zap, GitBranch } from 'lucide-react';
import { sendMessage, sendAgentV2 } from '../utils/api';
import toast from 'react-hot-toast';

const MODES = [
  { id: 'rag_answer',      label: 'General Chat',    icon: Brain,      color: '#6366f1' },
  { id: 'workout_plan',    label: 'Workout Plan',    icon: Dumbbell,   color: '#8b5cf6' },
  { id: 'diet_plan',       label: 'Diet Plan',       icon: Apple,      color: '#10b981' },
  { id: 'motivation',      label: 'Motivation',      icon: Flame,      color: '#f59e0b' },
  { id: 'progress_tips',   label: 'Progress Tips',   icon: TrendingUp, color: '#3b82f6' },
  { id: 'health_analysis', label: 'Health Analysis', icon: Brain,      color: '#ec4899' },
];

const TOOL_LABELS = {
  search_knowledge:        { label: 'Searching knowledge base',  color: '#6366f1', icon: '🔍' },
  analyze_health_metrics:  { label: 'Analyzing health metrics',  color: '#ef4444', icon: '❤️' },
  generate_workout_plan:   { label: 'Building workout plan',     color: '#8b5cf6', icon: '💪' },
  generate_diet_plan:      { label: 'Creating diet plan',        color: '#10b981', icon: '🥗' },
  generate_motivation:     { label: 'Generating motivation',     color: '#f59e0b', icon: '🔥' },
  analyze_progress:        { label: 'Analyzing your progress',   color: '#3b82f6', icon: '📊' },
  generate_health_report:  { label: 'Writing health report',     color: '#ec4899', icon: '📋' },
};

const QUICK_PROMPTS = [
  'Create a 7-day workout plan for me',
  'What should I eat today?',
  'How can I lose weight faster?',
  'Motivate me to stay consistent',
  'Analyze my health metrics',
  'How am I doing this week?',
];

const formatMsg = (text) => text
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/^### (.*$)/gm, '<h3>$1</h3>')
  .replace(/^## (.*$)/gm, '<h2>$1</h2>')
  .replace(/^# (.*$)/gm, '<h1>$1</h1>')
  .replace(/^- (.*$)/gm, '• $1<br/>')
  .replace(/\n\n/g, '<br/><br/>')
  .replace(/\n/g, '<br/>');

export default function ChatTab({ profile, logs, currentUser }) {
  const greeting = profile?.name
    ? `Hello, ${profile.name.split(' ')[0]}! 👋 I'm your AI health coach powered by Amazon Bedrock. Switch to **Agentic AI** mode to let me autonomously decide which tools to use. What would you like to work on today?`
    : `Hello! 👋 I'm your AI health coach. Complete your profile first for personalized advice.`;

  const [messages, setMessages]   = useState([{ role: 'ai', content: greeting }]);
  const [input, setInput]         = useState('');
  const [interim, setInterim]     = useState('');
  const [mode, setMode]           = useState('rag_answer');
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  // agentMode: 'classic' = old prompt router, 'langgraph' = new ReAct agent
  const [agentMode, setAgentMode] = useState('classic');

  const bottomRef       = useRef(null);
  const recognitionRef  = useRef(null);
  const silenceTimerRef = useRef(null);
  const modeRef         = useRef(mode);
  const agentModeRef    = useRef(agentMode);
  const loadingRef      = useRef(loading);

  useEffect(() => { modeRef.current = mode; },           [mode]);
  useEffect(() => { agentModeRef.current = agentMode; }, [agentMode]);
  useEffect(() => { loadingRef.current = loading; },     [loading]);
  useEffect(() => { setMessages([{ role: 'ai', content: greeting }]); }, [profile?.name]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const dispatchMessage = useCallback((msg) => {
    if (!msg || loadingRef.current) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    const sessionId = currentUser?.id || 'default';

    const apiCall = agentModeRef.current === 'langgraph'
      ? sendAgentV2({ message: msg, profile, logs, session_id: sessionId })
      : sendMessage({ message: msg, mode: modeRef.current, profile, logs });

    apiCall
      .then(res => {
        const data = res.data;
        // For LangGraph responses, attach tools_used to the message
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.response,
          tools_used: data.tools_used || [],
          agent_mode: data.mode || 'classic',
        }]);
      })
      .catch(() => {
        toast.error('Failed to get response. Check backend.');
        setMessages(prev => [...prev, {
          role: 'ai',
          content: '⚠️ Connection error. Ensure backend is running on port 8080 and AWS credentials are set in .env',
        }]);
      })
      .finally(() => setLoading(false));
  }, [profile, logs, currentUser]);

  const sendTyped = () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    dispatchMessage(msg);
  };

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported. Use Chrome or Edge.'); return; }
    if (listening) { stopListening(); return; }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';

    rec.onstart = () => {
      setListening(true); setInput(''); setInterim(''); finalText = '';
      toast.success('🎤 Listening... speak now', { duration: 2500 });
    };

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interimText += t;
      }
      setInterim(interimText);
      setInput(finalText.trim());
      clearTimeout(silenceTimerRef.current);
      if (finalText.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          const msg = finalText.trim();
          finalText = '';
          try { rec.stop(); } catch (_) {}
          setListening(false); setInterim(''); setInput('');
          dispatchMessage(msg);
        }, 2000);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') toast.error('Microphone access denied.');
      else if (e.error === 'no-speech') toast.error('No speech detected.');
      else if (e.error !== 'aborted') toast.error(`Voice error: ${e.error}`);
      stopListening();
    };

    rec.onend = () => {
      if (finalText.trim()) {
        const msg = finalText.trim(); finalText = '';
        clearTimeout(silenceTimerRef.current);
        setListening(false); setInterim(''); setInput('');
        dispatchMessage(msg);
      } else { setListening(false); setInterim(''); }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch { toast.error('Could not start microphone.'); setListening(false); }
  };

  const clearChat = () => {
    setMessages([{ role: 'ai', content: greeting }]);
    toast.success('Chat cleared');
  };

  const displayValue = listening ? `${input}${interim ? ' ' + interim : ''}` : input;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', minHeight: 0 }}>

      {/* Header */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>AI Health Coach</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Agent Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'classic',   label: 'Classic',  icon: Brain,      desc: 'Prompt Router' },
                { id: 'langgraph', label: 'Agentic',  icon: GitBranch,  desc: 'LangGraph ReAct' },
              ].map(opt => {
                const Icon = opt.icon;
                const active = agentMode === opt.id;
                return (
                  <button key={opt.id} onClick={() => setAgentMode(opt.id)} title={opt.desc} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: active ? (opt.id === 'langgraph' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)') : 'transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s',
                  }}>
                    <Icon size={12} /> {opt.label}
                  </button>
                );
              })}
            </div>
            <button onClick={clearChat} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}>
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>

        {/* Agent mode info banner */}
        <AnimatePresence mode="wait">
          {agentMode === 'langgraph' ? (
            <motion.div key="lg" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={14} color="#f59e0b" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>LangGraph ReAct Agent active</span> — The AI autonomously decides which tools to call. No mode selection needed. Just type naturally.
              </span>
            </motion.div>
          ) : (
            <motion.div key="cl" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MODES.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${mode === m.id ? m.color : 'rgba(255,255,255,0.1)'}`,
                      background: mode === m.id ? `${m.color}20` : 'transparent',
                      color: mode === m.id ? m.color : 'rgba(255,255,255,0.45)',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}>
                      <Icon size={12} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4, marginBottom: 12, minHeight: 0 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="#a5b4fc" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: msg.role === 'user' ? '75%' : '85%' }}>
                {/* Tools used trace — only for LangGraph responses */}
                {msg.tools_used?.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {msg.tools_used.map(t => {
                      const info = TOOL_LABELS[t] || { label: t, color: '#6b7280', icon: '🔧' };
                      return (
                        <span key={t} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: `${info.color}15`, border: `1px solid ${info.color}40`,
                          color: info.color,
                        }}>
                          {info.icon} {info.label}
                        </span>
                      );
                    })}
                  </motion.div>
                )}
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai ai-response'}
                  dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#a5b4fc" />
            </div>
            <div className="chat-bubble-ai" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
              {agentMode === 'langgraph' && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  Agent is reasoning and calling tools...
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => dispatchMessage(p)} disabled={loading} style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s ease',
            opacity: loading ? 0.5 : 1
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#a5b4fc'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            {p}
          </button>
        ))}
      </div>

      {/* Voice status bar */}
      <AnimatePresence>
        {listening && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                {[14, 22, 10, 20, 14].map((h, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: '#ef4444', height: h, animation: `voiceBar 0.7s ease-in-out ${i * 0.1}s infinite alternate` }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>Listening...</span>
              {(input || interim) && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{input}{interim ? ' ' + interim : ''}"
                </span>
              )}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Auto-sends after 2s pause</span>
              <button onClick={stopListening} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 11, flexShrink: 0, padding: '2px 6px' }}>✕ Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea className="input-field"
          placeholder={listening ? '🎤 Speak now — transcript appears here in real time...' : agentMode === 'langgraph' ? '🤖 Ask anything — the agent decides which tools to use...' : 'Ask your AI health coach anything...'}
          value={displayValue}
          onChange={e => { if (!listening) setInput(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !listening) { e.preventDefault(); sendTyped(); } }}
          rows={2}
          style={{ flex: 1, resize: 'none', borderColor: listening ? 'rgba(239,68,68,0.5)' : agentMode === 'langgraph' ? 'rgba(245,158,11,0.3)' : undefined, boxShadow: listening ? '0 0 0 3px rgba(239,68,68,0.1)' : undefined, transition: 'border-color 0.2s, box-shadow 0.2s' }}
        />
        <motion.button onClick={toggleVoice}
          animate={listening ? { scale: [1, 1.12, 1], boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 18px rgba(239,68,68,0.6)', '0 0 0px rgba(239,68,68,0)'] } : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }}
          transition={listening ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
          style={{ width: 42, height: 42, borderRadius: 10, cursor: 'pointer', flexShrink: 0, border: listening ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)', background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', color: listening ? '#ef4444' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s, color 0.2s, border-color 0.2s' }}>
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={sendTyped} disabled={loading || !input.trim()}
          style={{ height: 42, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, background: agentMode === 'langgraph' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', opacity: (loading || !input.trim()) ? 0.5 : 1, transition: 'all 0.3s' }}>
          <Send size={14} /> Send
        </motion.button>
      </div>

      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.3); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </motion.div>
  );
}
