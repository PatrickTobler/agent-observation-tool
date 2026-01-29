import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-neutral-200 p-6 flex flex-col gap-1">
        <Link href="/app/agents" className="text-sm font-medium mb-6 block">
          Agent Observation Tool
        </Link>
        <nav className="flex flex-col gap-1">
          <Link
            href="/app/agents"
            className="text-sm px-3 py-1.5 rounded hover:bg-neutral-100 text-neutral-700"
          >
            Agents
          </Link>
          <Link
            href="/app/settings/api-keys"
            className="text-sm px-3 py-1.5 rounded hover:bg-neutral-100 text-neutral-700"
          >
            API Keys
          </Link>
        </nav>
        <div className="mt-auto">
          <form action="/api/v1/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
