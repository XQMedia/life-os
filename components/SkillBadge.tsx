'use client';

interface SkillBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function getAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const sizes = {
  sm:  { outer: 'w-10 h-10', text: 'text-[10px]' },
  md:  { outer: 'w-12 h-12', text: 'text-xs' },
  lg:  { outer: 'w-16 h-16', text: 'text-base' },
};

export default function SkillBadge({ name, size = 'md' }: SkillBadgeProps) {
  const abbr = getAbbr(name);
  const { outer, text } = sizes[size];

  return (
    <div
      className={`flex-shrink-0 rounded-xl ${outer} flex items-center justify-center`}
      style={{
        background: 'linear-gradient(135deg, rgba(55,23,120,0.8) 0%, rgba(109,40,217,0.5) 100%)',
        border: '1px solid rgba(139,92,246,0.3)',
        boxShadow: '0 0 12px rgba(139,92,246,0.15)',
      }}
    >
      <span className={`font-mono font-bold tracking-widest text-violet-300 ${text}`}>
        {abbr}
      </span>
    </div>
  );
}
