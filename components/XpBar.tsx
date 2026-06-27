'use client';

interface XpBarProps {
  value: number; // 0–100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const heights: Record<string, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

export default function XpBar({
  value,
  size = 'md',
  showLabel = true,
  animated = false,
}: XpBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span
            className="font-mono text-[10px] tracking-[0.25em] uppercase"
            style={{ color: 'rgba(139,92,246,0.55)' }}
          >
            MASTERY
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'rgba(167,139,250,0.8)' }}>
            {clamped}<span style={{ color: 'rgba(226,226,236,0.2)' }}>/100</span>
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className={`w-full rounded-full overflow-hidden ${heights[size]}`}
        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.1)' }}
      >
        {/* Fill */}
        <div
          className={animated ? 'xp-fill-animate' : ''}
          style={{
            width: animated ? `${clamped}%` : `${clamped}%`,
            height: '100%',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, rgba(109,40,217,1) 0%, rgba(139,92,246,1) 60%, rgba(167,139,250,0.9) 100%)',
            boxShadow: '0 0 8px rgba(139,92,246,0.7), 0 0 2px rgba(167,139,250,0.9)',
            transition: animated ? undefined : 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
