export function StatCard({ value, label, className = "" }: { value: string | number; label: string; className?: string }) {
  return (
    <div className={`border border-border rounded-lg bg-bg-surface p-4 ${className}`}>
      <div className="text-2xl font-semibold text-text tabular-nums">{value}</div>
      <div className="text-xs text-text-tertiary mt-1">{label}</div>
    </div>
  );
}
