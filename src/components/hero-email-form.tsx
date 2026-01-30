"use client";

import { useState } from "react";

export function HeroEmailForm() {
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

  if (sent) {
    return (
      <p className="text-sm text-text-secondary">
        Check your email — we sent a sign-in link to{" "}
        <span className="text-text">{email}</span>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        className="flex-1 h-10 px-4 rounded-md bg-bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-text-muted transition-colors"
      />
      <button
        type="submit"
        disabled={sending}
        className="h-10 px-5 rounded-md text-sm font-medium bg-accent text-bg hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {sending ? "Sending..." : "Start for free"}
      </button>
      {error && <p className="text-sm text-error mt-2">{error}</p>}
    </form>
  );
}
