const statusStyles: Record<string, string> = {
  succeeded: "bg-success-subtle text-success border-green-900/50",
  failed: "bg-error-subtle text-error border-red-900/50",
  unknown: "bg-bg-elevated text-text-tertiary border-border",
  running: "bg-accent-subtle text-accent-text border-blue-900/50",
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
  const style = statusStyles[status] || statusStyles.unknown;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${style}`}>
      {status}
    </span>
  );
}

export function InteractionBadge({ type }: { type: string }) {
  const style = interactionStyles[type] || interactionStyles.Reasoning;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${style}`}>
      {type}
    </span>
  );
}
