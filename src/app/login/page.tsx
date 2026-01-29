"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Something went wrong.");
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="text-sm font-semibold text-text tracking-tight">
            Agent Observation
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="border border-border rounded-lg bg-bg-surface p-6">
            <h1 className="text-lg font-semibold text-text mb-1">Sign in</h1>
            <p className="text-sm text-text-tertiary mb-6">
              Enter your email to receive a magic link.
            </p>

            {sent ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M5.5 8l2 2 3-3.5" />
                  </svg>
                  <span className="text-sm font-medium text-text">Check your email</span>
                </div>
                <p className="text-sm text-text-tertiary">
                  We sent a sign-in link to <span className="text-text">{email}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending..." : "Send magic link"}
                </Button>
                {error && <p className="text-sm text-error">{error}</p>}
              </form>
            )}
          </div>
          <p className="text-xs text-text-muted text-center mt-4">
            New email? We&apos;ll create your workspace automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
