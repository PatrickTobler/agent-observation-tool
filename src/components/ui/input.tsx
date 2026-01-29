import { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-8 w-full rounded-md border border-border bg-bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${className}`}
      {...props}
    />
  );
}
