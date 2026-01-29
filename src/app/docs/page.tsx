import Link from "next/link";

type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: "API Key" | "Session" | "None";
  description: string;
  request?: Record<string, string>;
  response?: string;
  notes?: string;
};

const endpoints: Record<string, Endpoint[]> = {
  "Ingest Events": [
    {
      method: "POST",
      path: "/api/v1/eval-events",
      auth: "API Key",
      description: "Log an agent interaction event. This is the main endpoint.",
      request: {
        agent_name: "string — Name of the agent",
        task_id: "string — Unique task identifier",
        interaction_type:
          '"UserInput" | "ToolCall" | "McpCall" | "SkillCall" | "Reasoning" | "Result" | "Error"',
        message: "string — Human-readable description of what happened",
        ts: "string — ISO 8601 timestamp",
        "payload_json?": "object — Arbitrary input payload",
        "result_json?": "object — Arbitrary result data",
        "error_json?": "object — Error details",
      },
      response: `{ "event_id": "abc123", "accepted": true }`,
      notes:
        'Sending a "Result" event triggers automatic scoring if an evaluation rubric is configured for the agent.',
    },
  ],
  Agents: [
    {
      method: "GET",
      path: "/api/v1/agents",
      auth: "Session",
      description:
        "List all agents in your workspace with task counts, event counts, and last seen timestamps.",
      response: `{ "data": [{ "agent_name", "task_count", "event_count", "error_count", "last_seen" }], "next_cursor" }`,
    },
    {
      method: "GET",
      path: "/api/v1/agents/:agent_name/tasks",
      auth: "Session",
      description: "List all tasks for a specific agent.",
      response: `{ "data": [{ "task_id", "status", "started_at", "last_event_at", "duration_ms", "event_count", "error_count", "score", "verdict" }], "next_cursor" }`,
    },
    {
      method: "GET",
      path: "/api/v1/agents/:agent_name/scores",
      auth: "Session",
      description: "List evaluation scores for a specific agent.",
      response: `{ "data": [{ "id", "task_id", "score", "verdict", "evaluation_version", "llm_model", "created_at" }], "next_cursor" }`,
    },
  ],
  Evaluation: [
    {
      method: "GET",
      path: "/api/v1/agents/:agent_name/evaluation",
      auth: "Session",
      description:
        "Get the evaluation config (rubric, expected output) for an agent.",
      response: `{ "id", "agent_name", "rubric_text", "expected_text", "is_enabled", "version" }`,
    },
    {
      method: "PUT",
      path: "/api/v1/agents/:agent_name/evaluation",
      auth: "Session",
      description: "Update the evaluation rubric for an agent.",
      request: {
        "rubric_text?": "string — Scoring rubric for the LLM judge",
        "expected_text?": "string — Expected output to compare against",
        "is_enabled?": "boolean — Enable/disable auto-evaluation",
      },
      response: `{ "id", "version" }`,
    },
  ],
  Tasks: [
    {
      method: "GET",
      path: "/api/v1/tasks/:task_id",
      auth: "Session",
      description:
        "Get a task summary including events, scores, and metadata.",
    },
    {
      method: "GET",
      path: "/api/v1/tasks/:task_id/events",
      auth: "Session",
      description: "List all events for a specific task.",
      response: `{ "data": [{ "id", "interaction_type", "message", "payload_json", "result_json", "error_json", "ts" }], "next_cursor" }`,
    },
  ],
  "API Keys": [
    {
      method: "GET",
      path: "/api/v1/api-keys",
      auth: "Session",
      description: "List all API keys for your workspace.",
      response: `{ "data": [{ "id", "name", "prefix", "scopes", "createdAt", "lastUsedAt", "revokedAt" }] }`,
    },
    {
      method: "POST",
      path: "/api/v1/api-keys",
      auth: "Session",
      description:
        "Create a new API key. The secret is only returned once.",
      request: {
        name: "string — Display name for the key",
        "scopes?": "string[] — Permission scopes",
      },
      response: `{ "id", "secret", "prefix", "name" }`,
    },
    {
      method: "DELETE",
      path: "/api/v1/api-keys/:key_id",
      auth: "Session",
      description: "Revoke an API key.",
      response: `{ "ok": true }`,
    },
  ],
  Authentication: [
    {
      method: "POST",
      path: "/api/v1/auth/magic-link",
      auth: "None",
      description: "Request a magic link login email.",
      request: { email: "string — Your email address" },
      response: `{ "sent": true }`,
    },
    {
      method: "GET",
      path: "/api/v1/auth/magic-link/consume",
      auth: "None",
      description:
        "Consume a magic link token. Sets a session cookie and redirects to /app/agents.",
      notes: "Called automatically when clicking the email link.",
    },
    {
      method: "GET",
      path: "/api/v1/auth/logout",
      auth: "Session",
      description: "Revoke the current session and redirect to the landing page.",
    },
    {
      method: "GET",
      path: "/api/v1/me",
      auth: "Session",
      description: "Get the current user info.",
      response: `{ "user_id", "email", "workspace_id" }`,
    },
  ],
};

const methodColors: Record<string, string> = {
  GET: "text-success",
  POST: "text-accent-text",
  PUT: "text-warning",
  DELETE: "text-error",
};

const authLabels: Record<string, string> = {
  "API Key": "Bearer token",
  Session: "Cookie",
  None: "Public",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Agentwatcher" className="h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-24 pb-16 w-full">
        <h1 className="text-2xl font-semibold text-text tracking-tight mb-2">
          API Reference
        </h1>
        <p className="text-sm text-text-tertiary mb-10">
          Base URL:{" "}
          <code className="font-mono text-text-secondary">
            https://your-domain.com
          </code>
        </p>

        <section className="mb-10">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3">
            Authentication
          </h2>
          <div className="border border-border rounded-lg bg-bg-surface p-4 text-sm text-text-secondary space-y-2">
            <p>
              <span className="text-text font-medium">API Key</span> — For
              server-to-server calls (ingesting events). Pass as{" "}
              <code className="font-mono text-xs bg-bg-elevated px-1.5 py-0.5 rounded">
                Authorization: Bearer aot_...
              </code>
            </p>
            <p>
              <span className="text-text font-medium">Session</span> — For
              browser calls (dashboard). Set automatically via magic link
              login cookie.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3">
            Pagination
          </h2>
          <div className="border border-border rounded-lg bg-bg-surface p-4 text-sm text-text-secondary">
            All list endpoints support{" "}
            <code className="font-mono text-xs bg-bg-elevated px-1.5 py-0.5 rounded">
              ?limit=50&cursor=...
            </code>{" "}
            for pagination. Max limit is 100.
          </div>
        </section>

        {Object.entries(endpoints).map(([section, eps]) => (
          <section key={section} className="mb-12">
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-widest mb-4">
              {section}
            </h2>
            <div className="space-y-4">
              {eps.map((ep, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg bg-bg-surface overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
                    <span
                      className={`font-mono text-xs font-bold ${methodColors[ep.method]}`}
                    >
                      {ep.method}
                    </span>
                    <code className="font-mono text-sm text-text">
                      {ep.path}
                    </code>
                    <span className="ml-auto text-[11px] text-text-muted font-mono">
                      {authLabels[ep.auth]}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-sm text-text-secondary">
                      {ep.description}
                    </p>
                    {ep.request && (
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1.5">
                          Request Body
                        </p>
                        <div className="bg-bg rounded-md p-3 font-mono text-xs space-y-1">
                          {Object.entries(ep.request).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-text whitespace-nowrap">
                                {key}
                              </span>
                              <span className="text-text-muted">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ep.response && (
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1.5">
                          Response
                        </p>
                        <pre className="bg-bg rounded-md p-3 font-mono text-xs text-text-secondary overflow-x-auto">
                          {ep.response}
                        </pre>
                      </div>
                    )}
                    {ep.notes && (
                      <p className="text-xs text-text-muted">{ep.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-text-muted">
          <span>Agentwatcher</span>
          <Link href="/" className="hover:text-text transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
