'use client';

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  const hot = streak >= 7;
  const fillA = hot ? '#c9920b' : '#d4a017';
  const fillB = hot ? '#f0c040' : '#e8c020';
  const glowColor = hot ? 'rgba(180,130,0,0.55)' : 'rgba(200,150,10,0.45)';
  const glowWide = hot ? 'rgba(180,130,0,0.2)' : 'rgba(200,150,10,0.15)';

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: `linear-gradient(135deg, ${hot ? 'rgba(160,110,0,0.95)' : 'rgba(175,125,5,0.9)'} 0%, ${hot ? 'rgba(120,85,0,0.9)' : 'rgba(140,100,0,0.85)'} 100%)`,
        boxShadow: `0 0 14px ${glowColor}, 0 0 36px ${glowWide}, inset 0 1px 0 rgba(255,220,80,0.25)`,
        border: '1px solid rgba(220,175,40,0.3)',
      }}
    >
      {/* Flame */}
      <svg width="11" height="14" viewBox="0 0 11 14" fill="none" className="animate-flame flex-shrink-0">
        <path
          d="M5.5 0C5.5 3.2 3 4.5 3 7.5a2.5 2.5 0 0 0 5 0c0-2-1.2-3.3-1.2-5.2C6.2 3.8 5.8 5 5.5 6.5 5.2 5 5.5 2.8 5.5 0Z"
          fill={fillA}
        />
        <path
          d="M5.5 7C5.5 8.2 4.8 9 4.8 10a.9.9 0 0 0 1.8 0C6.6 9 6 8.2 5.5 7Z"
          fill={fillB}
        />
      </svg>

      <span
        className="font-mono font-black text-[13px] tracking-tight leading-none"
        style={{ color: 'rgba(255,255,255,0.97)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
      >
        {streak}
      </span>
    </div>
  );
}
