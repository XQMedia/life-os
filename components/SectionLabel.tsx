interface SectionLabelProps {
  index: string; // e.g. "01"
  label: string;
  className?: string;
}

export default function SectionLabel({ index, label, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-3 mb-5 ${className}`}>
      <span
        className="font-mono text-[10px] font-bold tracking-[0.25em]"
        style={{ color: 'rgba(139,92,246,0.55)' }}
      >
        [{index}]
      </span>
      <span
        className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase"
        style={{ color: 'rgba(226,226,236,0.3)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.1)' }} />
    </div>
  );
}
