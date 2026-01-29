"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Agents",
    href: "/app/agents",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: "API Keys",
    href: "/app/settings/api-keys",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="8" r="2.5" />
        <path d="M7.5 8H14" />
        <path d="M11 6v4" />
        <path d="M13 6v4" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-bg-surface border-r border-border flex flex-col">
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Agentwatcher" className="h-5" />
        </Link>
      </div>

      <nav className="flex-1 px-2">
        <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-text-muted uppercase tracking-widest">
          Monitor
        </div>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "text-text bg-bg-elevated"
                  : "text-text-secondary hover:text-text hover:bg-bg-surface-hover"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <a
          href="/api/v1/auth/logout"
          className="block px-2 py-1.5 text-sm text-text-tertiary hover:text-text transition-colors rounded-md hover:bg-bg-surface-hover"
        >
          Sign out
        </a>
      </div>
    </aside>
  );
}
