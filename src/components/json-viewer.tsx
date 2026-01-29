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
        <span className="text-neutral-500">{label}:</span>{" "}
        <span className="text-neutral-700">{data}</span>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-neutral-500 hover:text-black flex items-center gap-1"
      >
        <span className="text-xs">{expanded ? "▼" : "▶"}</span>
        {label}
      </button>
      {expanded && (
        <pre className="mt-1 p-3 bg-neutral-50 border border-neutral-200 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}
