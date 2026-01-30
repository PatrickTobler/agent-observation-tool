"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TableHeaderRow } from "@/components/ui/table";
import { relativeTime } from "@/lib/format";

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
      <h1 className="text-lg font-semibold text-text mb-8">API Keys</h1>

      <div className="mb-10 max-w-md">
        <div className="flex gap-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create"}
          </Button>
        </div>

        {newSecret && (
          <div className="mt-4 p-4 bg-bg-surface rounded-lg">
            <p className="text-xs text-text-muted mb-2">
              Copy this secret now. It will not be shown again.
            </p>
            <code className="text-sm font-mono text-text break-all select-all">
              {newSecret}
            </code>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-text-tertiary py-4">No API keys yet.</p>
      ) : (
        <Table>
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Prefix</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Last Used</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="text-text font-medium">{k.name}</TableCell>
                <TableCell mono>{k.prefix}...</TableCell>
                <TableCell className="text-text-muted text-xs">
                  {relativeTime(k.createdAt)}
                </TableCell>
                <TableCell className="text-text-muted text-xs">
                  {k.lastUsedAt ? relativeTime(k.lastUsedAt) : "Never"}
                </TableCell>
                <TableCell>
                  {k.revokedAt ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                      Revoked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!k.revokedAt && (
                    <Button variant="ghost" onClick={() => handleRevoke(k.id)} className="text-xs text-text-muted hover:text-error">
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
