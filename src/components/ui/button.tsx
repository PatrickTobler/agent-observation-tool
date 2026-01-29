import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "text-text-secondary border border-border hover:bg-bg-surface-hover hover:text-text",
  danger:
    "text-error border border-border hover:bg-error-subtle",
  ghost:
    "text-text-secondary hover:bg-bg-surface-hover hover:text-text",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center text-sm font-medium h-8 px-3 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
