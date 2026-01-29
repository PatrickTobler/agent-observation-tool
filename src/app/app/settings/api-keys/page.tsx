"use client";

import { useEffect, useState } from "react";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadKeys() {
    const res = await fetch("/api/v1/api-keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.data ?? data.keys ?? data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setNewSecret(null);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewSecret(data.secret ?? null);
      setName("");
      await loadKeys();
    }
    setCreating(false);
  }

  async function handleRevoke(keyId: string) {
    await fetch(`/api/v1/api-keys/${keyId}`, { method: "DELETE" });
    await loadKeys();
  }

  return (
    <div>
      <h1 className="text-xl font-medium mb-6">API Keys</h1>

      <div className="mb-8 max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name"
            className="flex-1 border border-neutral-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-neutral-400"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="bg-black text-white text-sm px-4 py-1.5 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>

        {newSecret && (
          <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded">
            <p className="text-xs text-neutral-500 mb-1">
              Copy this secret now. It will not be shown again.
            </p>
            <code className="text-sm font-mono break-all select-all">{newSecret}</code>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-neutral-500">No API keys yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Prefix</th>
              <th className="pb-2 font-medium">Created</th>
              <th className="pb-2 font-medium">Last Used</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-neutral-100">
                <td className="py-2.5">{k.name}</td>
                <td className="py-2.5 font-mono text-xs text-neutral-600">
                  {k.prefix}...
                </td>
                <td className="py-2.5 text-neutral-500">
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 text-neutral-500">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                </td>
                <td className="py-2.5">
                  {k.revokedAt ? (
                    <span className="text-xs text-neutral-400">Revoked</span>
                  ) : (
                    <span className="text-xs text-black">Active</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {!k.revokedAt && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-xs text-neutral-400 hover:text-black"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
