'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const MOCK_RESPONSES: Record<string, string[]> = {
  default: [
    "I've analyzed your current progress. Your consistency is what sets top performers apart — keep that streak alive.",
    "Based on your active quests, I'd recommend tackling your most cognitively demanding task in the first 90 minutes of your day. That's when your prefrontal cortex is sharpest.",
    "One pattern I notice: your best days follow a clear morning intention. Have you written yours for today?",
    "You're building something real here. Every small action compounds. What's the one thing that would make today a win?",
    "Interesting question. The research on this is clear: focus on systems, not goals. Your habits here are your systems — protect them.",
  ],
  greeting: [
    "Good to see you. You're building a track record — that's what identity is made of.",
    "Hey. Ready to make progress? What are we focusing on today?",
    "Welcome back. Let's make today count.",
  ],
  motivation: [
    "Here's the thing about motivation — it follows action, it doesn't precede it. Start the smallest possible version of the task and let momentum build.",
    "The people you admire most weren't motivated every day. They just showed up anyway. That's the whole secret.",
    "Discipline is just doing what you said you'd do long after the mood you said it in has passed.",
  ],
  help: [
    "I can help you think through your quests, reflect on your progress, plan your day, break down big goals, or just be a sounding board. What do you need?",
    "Think of me as your strategic advisor. Ask me anything — from daily planning to big life decisions. I'm here to help you think clearer.",
  ],
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.match(/hi|hello|hey|good morning|morning/)) {
    return MOCK_RESPONSES.greeting[Math.floor(Math.random() * MOCK_RESPONSES.greeting.length)];
  }
  if (lower.match(/motivat|inspired|tired|stuck|procrastinat/)) {
    return MOCK_RESPONSES.motivation[Math.floor(Math.random() * MOCK_RESPONSES.motivation.length)];
  }
  if (lower.match(/help|what can you|how do/)) {
    return MOCK_RESPONSES.help[Math.floor(Math.random() * MOCK_RESPONSES.help.length)];
  }
  return MOCK_RESPONSES.default[Math.floor(Math.random() * MOCK_RESPONSES.default.length)];
}

const AMBIENT_HINTS = [
  "💡 Tip: Completing 3+ habits daily doubles your XP gain.",
  "🔥 Your streak is your most valuable asset — protect it.",
  "🧠 Log what you learn in Brain to build your knowledge base.",
  "⚡ Focus sessions of 25 min earn bonus XP for linked skills.",
  "📖 A 2-minute journal entry rewires how you remember the day.",
];

export default function AIChatSidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hey. I'm ARIA — your AI co-pilot inside Life.OS. Ask me anything: planning, reflection, strategy, or just talk.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hintIdx] = useState(() => Math.floor(Math.random() * AMBIENT_HINTS.length));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    const reply = getMockResponse(text);
    setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, ts: Date.now() }]);
    setLoading(false);
  }

  return (
    <>
      {/* Ambient hint strip — shows when sidebar closed */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-20 right-4 z-40 max-w-[240px]"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            <div
              className="rounded-xl px-3 py-2 text-[10px] font-mono leading-relaxed cursor-pointer"
              style={{
                background: 'rgba(7,7,13,0.85)',
                border: '1px solid rgba(139,92,246,0.18)',
                color: 'rgba(139,92,246,0.6)',
                backdropFilter: 'blur(12px)',
              }}
              onClick={() => setOpen(true)}
            >
              {AMBIENT_HINTS[hintIdx]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: open
            ? 'rgba(7,7,13,0.95)'
            : 'linear-gradient(135deg, rgba(109,40,217,1) 0%, rgba(139,92,246,0.85) 100%)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: open
            ? '0 0 0 1px rgba(139,92,246,0.25)'
            : '0 0 24px rgba(109,40,217,0.5), 0 0 48px rgba(109,40,217,0.2)',
        }}
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        transition={{ duration: 0.15 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg key="close" width="16" height="16" viewBox="0 0 16 16" fill="none"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <path d="M4 4L12 12M12 4L4 12" stroke="rgba(139,92,246,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
            </motion.svg>
          ) : (
            <motion.svg key="chat" width="18" height="18" viewBox="0 0 18 18" fill="none"
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <path d="M9 2C5.13 2 2 4.91 2 8.5c0 1.74.72 3.32 1.9 4.47L3 16l3.22-1.02C7.34 15.63 8.14 15.8 9 15.8c3.87 0 7-2.91 7-6.5C16 5.41 12.87 2 9 2z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
              <circle cx="6.5" cy="8.5" r="0.8" fill="white" opacity="0.8"/>
              <circle cx="9" cy="8.5" r="0.8" fill="white" opacity="0.8"/>
              <circle cx="11.5" cy="8.5" r="0.8" fill="white" opacity="0.8"/>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sidebar panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
            style={{ width: 'min(380px, 100vw)' }}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Backdrop blur panel */}
            <div
              className="flex flex-col h-full"
              style={{
                background: 'rgba(7,7,13,0.96)',
                borderLeft: '1px solid rgba(139,92,246,0.18)',
                backdropFilter: 'blur(32px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(109,40,217,0.9), rgba(139,92,246,0.6))',
                      boxShadow: '0 0 12px rgba(139,92,246,0.4)',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>✦</span>
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'rgba(226,226,236,0.9)' }}>ARIA</div>
                    <div className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(139,92,246,0.5)' }}>AI CO-PILOT</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(74,222,128,0.8)' }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(74,222,128,0.5)' }}>LIVE</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={
                        msg.role === 'user'
                          ? {
                              background: 'rgba(109,40,217,0.3)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              color: 'rgba(226,226,236,0.9)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(139,92,246,0.12)',
                              color: 'rgba(226,226,236,0.75)',
                            }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)' }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: 'rgba(139,92,246,0.6)' }}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                          transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="px-4 py-4 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
              >
                <div
                  className="flex items-end gap-2 rounded-xl px-3 py-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                    placeholder="Ask ARIA anything..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
                    style={{
                      color: 'rgba(226,226,236,0.85)',
                      maxHeight: 120,
                      scrollbarWidth: 'none',
                    }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                    }}
                  />
                  <motion.button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-30"
                    style={{
                      background: 'linear-gradient(135deg, rgba(109,40,217,1), rgba(139,92,246,0.8))',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.button>
                </div>
                <p className="mt-2 text-center font-mono text-[9px]" style={{ color: 'rgba(139,92,246,0.25)' }}>
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay when sidebar open on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
