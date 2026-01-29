"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface EvalConfig {
  rubricText: string | null;
  expectedText: string | null;
  isEnabled: boolean;
  version: number;
}

export default function EvaluationPage() {
  const params = useParams<{ agent_name: string }>();
  const agentName = decodeURIComponent(params.agent_name);

  const [rubricText, setRubricText] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/agents/${encodeURIComponent(agentName)}/evaluation`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: EvalConfig | null) => {
        if (data) {
          setRubricText(data.rubricText || "");
          setExpectedText(data.expectedText || "");
          setIsEnabled(data.isEnabled);
          setVersion(data.version);
        }
      })
      .finally(() => setLoading(false));
  }, [agentName]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch(
      `/api/v1/agents/${encodeURIComponent(agentName)}/evaluation`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubricText: rubricText || null,
          expectedText: expectedText || null,
          isEnabled,
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      setVersion(data.version ?? version + 1);
      setMessage("Saved.");
    } else {
      setMessage("Failed to save.");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading...</div>;
  }

  return (
    <div>
      <div className="text-sm text-neutral-500 mb-4">
        <Link href="/app/agents" className="hover:text-black">
          Agents
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/app/agents/${encodeURIComponent(agentName)}`}
          className="hover:text-black"
        >
          {agentName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-black">Evaluation</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-medium">Evaluation Config</h1>
        {version > 0 && (
          <span className="text-xs text-neutral-400">v{version}</span>
        )}
      </div>

      <div className="max-w-xl flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Rubric</label>
          <textarea
            value={rubricText}
            onChange={(e) => setRubricText(e.target.value)}
            rows={6}
            className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 resize-y"
            placeholder="Describe how the agent should be evaluated..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Expected Output</label>
          <textarea
            value={expectedText}
            onChange={(e) => setExpectedText(e.target.value)}
            rows={4}
            className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 resize-y"
            placeholder="Expected output for comparison..."
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`w-9 h-5 rounded-full transition-colors ${
              isEnabled ? "bg-black" : "bg-neutral-300"
            } relative`}
          >
            <span
              className={`block w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                isEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm">Evaluation enabled</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white text-sm px-4 py-1.5 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {message && (
            <span className="text-sm text-neutral-500">{message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
