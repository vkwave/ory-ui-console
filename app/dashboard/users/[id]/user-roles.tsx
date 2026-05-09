"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import Link from "next/link";
import type { RelationTuple } from "@/lib/ory/keto";

export function UserRoles({ userId }: { userId: string }) {
  const [assigned, setAssigned] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [userRes, allRes] = await Promise.all([
        fetch(`/api/keto/relations?${new URLSearchParams({ namespace: "roles", subject_id: userId })}`),
        fetch(`/api/keto/relations?${new URLSearchParams({ namespace: "roles" })}`),
      ]);
      if (!userRes.ok) throw new Error(await userRes.text());
      if (!allRes.ok) throw new Error(await allRes.text());

      const userTuples: RelationTuple[] = (await userRes.json()).relation_tuples ?? [];
      const allTuples: RelationTuple[] = (await allRes.json()).relation_tuples ?? [];

      const assignedRoles = userTuples.map((t) => t.object);
      const allRoles = [...new Set(allTuples.map((t) => t.object))];
      const unassigned = allRoles.filter((r) => !assignedRoles.includes(r));

      setAssigned(assignedRoles);
      setAvailable(unassigned);
      setSelected(unassigned[0] ?? "");
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  async function assign() {
    if (!selected) return;
    setError("");
    try {
      const res = await fetch("/api/keto/relations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace: "roles", object: selected, relation: "member", subject_id: userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  }

  async function remove(role: string) {
    setError("");
    try {
      const res = await fetch("/api/keto/relations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace: "roles", object: role, relation: "member", subject_id: userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assigned.map((role) => (
              <Badge key={role} className="gap-1.5 pr-1.5">
                {role}
                <button
                  onClick={() => remove(role)}
                  className="rounded-full transition-opacity hover:opacity-70"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {!loading && available.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex h-9 w-36 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {available.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button size="sm" onClick={assign} disabled={!selected}>
              Assign
            </Button>
          </div>
        )}

        {!loading && available.length === 0 && assigned.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No roles exist yet.{" "}
            <Link href="/dashboard/roles" className="underline underline-offset-2">
              Create roles
            </Link>{" "}
            first.
          </p>
        )}

        {!loading && available.length === 0 && assigned.length > 0 && (
          <p className="text-sm text-muted-foreground">All available roles assigned.</p>
        )}

        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
