import Link from "next/link";

const features = [
  {
    title: "Agent Monitoring",
    description: "Track every agent execution with structured events. See tasks, tool calls, reasoning, and results in real time.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    title: "Event Timelines",
    description: "Drill into any task to see the full event timeline — user inputs, tool calls, MCP calls, reasoning, results, and errors.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h14" />
        <path d="M3 10h10" />
        <path d="M3 16h6" />
      </svg>
    ),
  },
  {
    title: "LLM Scoring",
    description: "Automatically evaluate agent outputs using an LLM judge. Define rubrics and expected outputs per agent, get 1-10 scores.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6L5.1 18l.9-5.3-4-3.9 5.5-.8z" />
      </svg>
    ),
  },
  {
    title: "Multi-Tenant",
    description: "Each workspace is fully isolated. Teams get their own agents, API keys, evaluations, and data — no cross-contamination.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="3" />
        <circle cx="13" cy="13" r="3" />
        <path d="M10 4a6 6 0 0 1 6 6" />
      </svg>
    ),
  },
  {
    title: "API-First",
    description: "Ingest events with a single POST request. Query agents, tasks, and scores via REST. Integrate with any language or framework.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 5L3 10l4 5" />
        <path d="M13 5l4 5-4 5" />
        <path d="M11 3l-2 14" />
      </svg>
    ),
  },
  {
    title: "Magic Link Auth",
    description: "No passwords. Enter your email, click the link, you're in. New emails automatically create a workspace — zero friction onboarding.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="16" height="12" rx="2" />
        <path d="M2 6l8 5 8-5" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-text tracking-tight">
            Agent Observation
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-32 pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-accent-text bg-accent-subtle border border-blue-900/50 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Open source agent observability
            </div>
            <h1 className="text-4xl font-semibold text-text tracking-tight leading-[1.15] mb-4">
              Monitor, evaluate, and score your AI agents
            </h1>
            <p className="text-lg text-text-tertiary leading-relaxed mb-8">
              Ingest structured events from any agent framework. See what your agents are doing, how they&apos;re performing, and where they&apos;re failing — with automatic LLM-based scoring.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                Start monitoring
              </Link>
              <a
                href="https://github.com/PatrickTobler/agent-observation-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium text-text-secondary border border-border hover:bg-bg-surface-hover hover:text-text transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="border border-border rounded-lg p-5 bg-bg-surface hover:bg-bg-surface-hover transition-colors"
              >
                <div className="text-text-tertiary mb-3">{feature.icon}</div>
                <h3 className="text-sm font-medium text-text mb-1.5">{feature.title}</h3>
                <p className="text-sm text-text-tertiary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Code example */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
            Ingest events in one API call
          </h2>
          <div className="border border-border rounded-lg bg-bg-surface overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle">
              <span className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-xs text-text-muted font-mono">terminal</span>
            </div>
            <pre className="p-5 text-sm font-mono text-text-secondary overflow-x-auto leading-relaxed">
{`curl -X POST /api/v1/eval-events \\
  -H "Authorization: Bearer sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_name": "support-bot",
    "task_id": "task_abc123",
    "interaction_type": "Result",
    "message": "Resolved customer billing question",
    "payload_json": "{\\"tokens\\": 1842}",
    "result_json": "{\\"answer\\": \\"...\\", \\"confidence\\": 0.95}"
  }'`}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-text-muted">
            <span>Agent Observation Tool</span>
            <a
              href="https://github.com/PatrickTobler/agent-observation-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors"
            >
              GitHub
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
