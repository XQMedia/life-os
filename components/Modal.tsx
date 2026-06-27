'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, subtitle, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(7,7,13,0.75)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        {/* Backdrop blur */}
        <div className="absolute inset-0 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-md z-10"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(160deg, rgba(15,12,28,0.97) 0%, rgba(10,8,20,0.99) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '20px',
            boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 24px 60px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.06)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-6 pt-6 pb-5"
            style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}
          >
            <div>
              <p
                className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1"
                style={{ color: 'rgba(139,92,246,0.55)' }}
              >
                {subtitle ?? 'INPUT REQUIRED'}
              </p>
              <h2 className="text-base font-black tracking-tight text-white/90">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-6 py-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
