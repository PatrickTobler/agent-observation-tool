"use client";

import { useState } from "react";

export function JsonViewer({ data, label }: { data: string | null; label: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return (
      <div className="text-sm">
        <span className="text-text-muted">{label}:</span>{" "}
        <span className="text-text-secondary">{data}</span>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-text-muted hover:text-text flex items-center gap-1 transition-colors"
      >
        <span className="text-xs">{expanded ? "▼" : "▶"}</span>
        {label}
      </button>
      {expanded && (
        <pre className="mt-1 p-3 bg-bg-elevated border border-border-subtle rounded-md text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}
