export function StatCard({
  value,
  label,
  color,
  className = "",
}: {
  value: string | number;
  label: string;
  color?: "success" | "error" | "default";
  className?: string;
}) {
  const colorClass =
    value === 0
      ? "text-text-muted"
      : color === "success"
        ? "text-success"
        : color === "error"
          ? "text-error"
          : "text-text";

  return (
    <div className={`rounded-lg bg-bg-surface p-5 ${className}`}>
      <div className={`text-3xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
      <div className="text-xs text-text-muted mt-1.5">{label}</div>
    </div>
  );
}
