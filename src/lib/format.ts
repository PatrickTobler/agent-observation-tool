export function relativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

export function formatScore(score: number | null): { text: string; className: string } {
  if (score === null || score === undefined) return { text: "---", className: "text-text-muted" };
  if (score >= 8) return { text: `${score}/10`, className: "text-success" };
  if (score >= 5) return { text: `${score}/10`, className: "text-warning" };
  return { text: `${score}/10`, className: "text-error" };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
