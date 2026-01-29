import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
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

      <main className="flex-1 flex flex-col justify-center">
        <section className="max-w-3xl mx-auto px-6 py-32">
          <h1 className="text-4xl font-semibold text-text tracking-tight leading-[1.15] mb-4">
            The simplest way to log and evaluate AI agents.
          </h1>
          <p className="text-lg text-text-tertiary leading-relaxed mb-10 max-w-xl">
            Send one API call to log what your agent did. We score it automatically. No complicated setup, no complicated dashboard.
          </p>

          <div className="flex items-center gap-3 mb-20">
            <Link
              href="/login"
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Start for free
            </Link>
            <a
              href="https://github.com/PatrickTobler/agent-observation-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium text-text-secondary border border-border hover:bg-bg-surface-hover hover:text-text transition-colors"
            >
              GitHub
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div>
              <h3 className="text-sm font-medium text-text mb-1">1. Send events</h3>
              <p className="text-sm text-text-tertiary">One POST request per agent action. That&apos;s it.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text mb-1">2. See what happened</h3>
              <p className="text-sm text-text-tertiary">Every task gets a timeline. Inputs, tool calls, results, errors.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text mb-1">3. Get a score</h3>
              <p className="text-sm text-text-tertiary">An LLM reads the output and scores it 1-10. Write a rubric or don&apos;t.</p>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-bg-surface overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle">
              <span className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-xs text-text-muted font-mono">that&apos;s the whole API</span>
            </div>
            <pre className="p-5 text-sm font-mono text-text-secondary overflow-x-auto leading-relaxed">
{`curl -X POST /api/v1/eval-events \\
  -H "Authorization: Bearer sk_..." \\
  -d '{
    "agent_name": "support-bot",
    "task_id": "task_123",
    "interaction_type": "Result",
    "message": "Answered the customer question"
  }'`}
            </pre>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-text-muted">
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
    </div>
  );
}
