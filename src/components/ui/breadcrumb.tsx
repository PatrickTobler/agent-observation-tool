import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-tertiary mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-text transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
