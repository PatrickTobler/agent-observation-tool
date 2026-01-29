"use client";

import { useState } from "react";

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-medium mb-1">Agent Observation Tool</h1>
        <p className="text-sm text-neutral-500 mb-8">Sign in to your account</p>

        {sent ? (
          <div className="text-sm">
            <p className="mb-1">Check your email.</p>
            <p className="text-neutral-500">
              We sent a sign-in link to <span className="text-black">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-black text-white text-sm py-2 rounded hover:bg-neutral-800 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
