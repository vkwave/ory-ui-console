"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ConsentSession } from "@/lib/ory/hydra";

export default function ConsentsPage() {
  const [subject, setSubject] = useState("");
  const [sessions, setSessions] = useState<ConsentSession[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!subject) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/hydra/consents?subject=${encodeURIComponent(subject)}`);
      if (!res.ok) throw new Error(await res.text());
      setSessions(await res.json());
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  async function revoke(clientId?: string) {
    const q = clientId ? `&client=${encodeURIComponent(clientId)}` : "";
    await fetch(`/api/hydra/consents?subject=${encodeURIComponent(subject)}${q}`, {
      method: "DELETE",
    });
    await search();
  }

  const columns: Column<ConsentSession>[] = [
    {
      key: "client",
      header: "Client",
      cell: (s) => s.consent_request?.client?.client_name || s.consent_request?.client?.client_id || "—",
    },
    {
      key: "scopes",
      header: "Granted Scopes",
      cell: (s) => (
        <div className="flex gap-1 flex-wrap">
          {(s.grant_scope ?? []).map((scope) => (
            <Badge key={scope} variant="secondary">{scope}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "revoke",
      header: "",
      cell: (s) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => revoke(s.consent_request?.client?.client_id)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Consent Sessions</h1>

      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <Label>Subject (user ID)</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="kratos identity ID"
            className="w-72"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <Button onClick={search} disabled={loading || !subject}>
          {loading ? "…" : "Search"}
        </Button>
        {sessions.length > 0 && (
          <Button variant="destructive" onClick={() => revoke()} disabled={loading}>
            Revoke All
          </Button>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {sessions.length > 0 && (
        <DataTable
          columns={columns}
          data={sessions}
          keyExtractor={(s, i) => s.consent_request?.client?.client_id ?? String(i)}
          emptyMessage="No consent sessions."
        />
      )}
    </div>
  );
}
