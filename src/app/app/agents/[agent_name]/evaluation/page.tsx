"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

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
    return <div className="text-sm text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Agents", href: "/app/agents" },
          { label: agentName, href: `/app/agents/${encodeURIComponent(agentName)}` },
          { label: "Evaluation" },
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-semibold text-text">Evaluation Config</h1>
        {version > 0 && (
          <span className="text-xs text-text-muted font-mono">v{version}</span>
        )}
      </div>

      <div className="max-w-xl flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Rubric</label>
          <Textarea
            value={rubricText}
            onChange={(e) => setRubricText(e.target.value)}
            rows={6}
            placeholder="Describe how the agent should be evaluated..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Expected Output</label>
          <Textarea
            value={expectedText}
            onChange={(e) => setExpectedText(e.target.value)}
            rows={4}
            placeholder="Expected output for comparison..."
          />
        </div>

        <div className="flex items-center gap-3">
          <Toggle checked={isEnabled} onChange={setIsEnabled} />
          <span className="text-sm text-text-secondary">Evaluation enabled</span>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {message && (
            <span className={`text-sm ${message === "Saved." ? "text-success" : "text-error"}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
