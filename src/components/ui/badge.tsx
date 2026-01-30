const statusDot: Record<string, string> = {
  succeeded: "bg-success",
  failed: "bg-error",
  unknown: "bg-text-muted",
  running: "bg-accent-text",
};

const interactionStyles: Record<string, string> = {
  UserInput: "bg-blue-950 text-blue-400 border-blue-900/50",
  ToolCall: "bg-purple-950 text-purple-400 border-purple-900/50",
  McpCall: "bg-purple-950 text-purple-400 border-purple-900/50",
  SkillCall: "bg-violet-950 text-violet-400 border-violet-900/50",
  Reasoning: "bg-bg-elevated text-text-tertiary border-border",
  Result: "bg-green-950 text-green-400 border-green-900/50",
  Error: "bg-red-950 text-red-400 border-red-900/50",
};

export function StatusBadge({ status }: { status: string }) {
  const dot = statusDot[status] || statusDot.unknown;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

export function InteractionBadge({ type }: { type: string }) {
  const style = interactionStyles[type] || interactionStyles.Reasoning;
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${style}`}>
      {type}
    </span>
  );
}
