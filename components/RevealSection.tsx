'use client';

import { motion } from 'framer-motion';

interface RevealSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'left';
}

export default function RevealSection({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: RevealSectionProps) {
  const initial =
    direction === 'up'
      ? { opacity: 0, y: 28 }
      : { opacity: 0, x: -20 };

  const animate =
    direction === 'up'
      ? { opacity: 1, y: 0 }
      : { opacity: 1, x: 0 };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
