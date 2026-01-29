import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full text-sm ${className}`} {...props} />;
}

export function TableHead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-border-subtle hover:bg-bg-surface-hover transition-colors ${className}`}
      {...props}
    />
  );
}

export function TableHeaderCell({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`pb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider text-left ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = "", mono, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean }) {
  return (
    <td
      className={`py-2.5 ${mono ? "font-mono text-xs tabular-nums text-text-secondary" : "text-text-secondary"} ${className}`}
      {...props}
    />
  );
}

export function TableHeaderRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b border-border ${className}`} {...props} />;
}
