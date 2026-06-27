'use client';

interface InitialsBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const sizes = {
  sm:  { outer: 'w-9 h-9',    text: 'text-xs' },
  md:  { outer: 'w-12 h-12',  text: 'text-sm' },
  lg:  { outer: 'w-16 h-16',  text: 'text-lg' },
  xl:  { outer: 'w-24 h-24',  text: 'text-2xl' },
};

export default function InitialsBadge({ name, size = 'md' }: InitialsBadgeProps) {
  const initials = name ? getInitials(name) : '??';
  const { outer, text } = sizes[size];

  return (
    <div
      className={`relative flex-shrink-0 rounded-full ${outer} flex items-center justify-center`}
      style={{
        background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.6) 50%, rgba(167,139,250,0.4) 100%)',
        boxShadow: '0 0 0 1px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(139,92,246,0.12)',
      }}
    >
      <span className={`font-mono font-black tracking-widest text-white/90 ${text}`}>
        {initials}
      </span>
    </div>
  );
}
