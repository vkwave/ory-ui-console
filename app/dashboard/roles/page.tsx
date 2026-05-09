"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { X, Pencil, Check, Trash2, Plus } from "lucide-react";
import type { RelationTuple } from "@/lib/ory/keto";

interface RoleData {
  name: string;
  members: string[];
  persisted: boolean;
  loading: boolean;
  newMemberId: string;
  editing: boolean;
  editName: string;
}

function makeRole(name: string, members: string[], persisted: boolean): RoleData {
  return { name, members, persisted, loading: false, newMemberId: "", editing: false, editName: name };
}

async function ketoWrite(method: "PUT" | "DELETE", body: object) {
  const res = await fetch("/api/keto/relations", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed: ${res.status}`);
  }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState("");

  async function loadAllRoles() {
    let nextError = "";
    let nextRoles: RoleData[] | null = null;
    try {
      const res = await fetch(`/api/keto/relations?${new URLSearchParams({ namespace: "roles" })}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const tuples: RelationTuple[] = data.relation_tuples ?? [];

      const roleMap = new Map<string, string[]>();
      for (const t of tuples) {
        if (!roleMap.has(t.object)) roleMap.set(t.object, []);
        if (t.subject_id) roleMap.get(t.object)!.push(t.subject_id);
      }
      nextRoles = [...roleMap.entries()].map(([name, members]) => ({ ...makeRole(name, members, true) }));
    } catch (e) {
      nextError = String(e);
    }
    setError(nextError);
    if (nextRoles !== null) {
      setRoles((prev) =>
        nextRoles!.map((r) => ({ ...r, newMemberId: prev.find((p) => p.name === r.name)?.newMemberId ?? "" }))
      );
    }
    setPageLoading(false);
  }

  useEffect(() => { loadAllRoles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(name: string, update: Partial<RoleData>) {
    setRoles((prev) => prev.map((r) => (r.name === name ? { ...r, ...update } : r)));
  }

  function createRole() {
    const name = newRoleName.trim();
    if (!name) return;
    if (roles.some((r) => r.name === name)) {
      setError(`Role "${name}" already exists.`);
      return;
    }
    setRoles((prev) => [...prev, makeRole(name, [], false)]);
    setNewRoleName("");
    setError("");
  }

  async function addMember(role: RoleData) {
    const userId = role.newMemberId.trim();
    if (!userId) return;
    setError("");
    patch(role.name, { loading: true });
    try {
      await ketoWrite("PUT", { namespace: "roles", object: role.name, relation: "member", subject_id: userId });
      patch(role.name, { newMemberId: "", persisted: true });
      await loadAllRoles();
    } catch (e) {
      setError(String(e));
      patch(role.name, { loading: false });
    }
  }

  async function removeMember(roleName: string, userId: string) {
    setError("");
    try {
      await ketoWrite("DELETE", { namespace: "roles", object: roleName, relation: "member", subject_id: userId });
      await loadAllRoles();
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteRole(role: RoleData) {
    setError("");
    if (!role.persisted) {
      setRoles((prev) => prev.filter((r) => r.name !== role.name));
      return;
    }
    patch(role.name, { loading: true });
    try {
      await Promise.all(
        role.members.map((uid) =>
          ketoWrite("DELETE", { namespace: "roles", object: role.name, relation: "member", subject_id: uid })
        )
      );
      setRoles((prev) => prev.filter((r) => r.name !== role.name));
    } catch (e) {
      setError(String(e));
      patch(role.name, { loading: false });
    }
  }

  async function saveRename(role: RoleData) {
    const newName = role.editName.trim();
    if (!newName || newName === role.name) {
      patch(role.name, { editing: false, editName: role.name });
      return;
    }
    if (roles.some((r) => r.name === newName)) {
      setError(`Role "${newName}" already exists.`);
      return;
    }
    setError("");
    if (!role.persisted) {
      setRoles((prev) =>
        prev.map((r) => (r.name === role.name ? { ...r, name: newName, editName: newName, editing: false } : r))
      );
      return;
    }
    patch(role.name, { loading: true });
    try {
      await Promise.all(
        role.members.map((uid) =>
          ketoWrite("PUT", { namespace: "roles", object: newName, relation: "member", subject_id: uid })
        )
      );
      await Promise.all(
        role.members.map((uid) =>
          ketoWrite("DELETE", { namespace: "roles", object: role.name, relation: "member", subject_id: uid })
        )
      );
      await loadAllRoles();
    } catch (e) {
      setError(String(e));
      patch(role.name, { loading: false });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Keto"
        title="Roles"
        description="Manage roles and their members. Roles are stored as relation tuples in the Keto roles namespace."
        className="mb-0"
      />

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>New Role</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRole()}
              placeholder="role name (e.g. moderator)"
              className="max-w-xs"
            />
            <Button size="sm" onClick={createRole} disabled={!newRoleName.trim()}>
              <Plus className="mr-1.5 size-3.5" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {pageLoading ? (
        <p className="text-sm text-muted-foreground">Loading roles…</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles found. Create one above.</p>
      ) : (
        roles.map((role) => (
          <Card key={role.name} className={role.loading ? "opacity-60 pointer-events-none" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                {role.editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={role.editName}
                      onChange={(e) => patch(role.name, { editName: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(role);
                        if (e.key === "Escape") patch(role.name, { editing: false, editName: role.name });
                      }}
                      className="h-8 w-40 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveRename(role)}>
                      <Check className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => patch(role.name, { editing: false, editName: role.name })}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="capitalize">{role.name}</CardTitle>
                    {!role.persisted && (
                      <Badge variant="secondary" className="text-xs">unsaved</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => patch(role.name, { editing: true })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteRole(role)}>
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {role.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {role.persisted ? "No members." : "Add a member below to save this role to Keto."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {role.members.map((uid) => (
                    <Badge key={uid} variant="secondary" className="gap-1.5 pr-1.5 font-mono text-xs">
                      {uid.slice(0, 8)}…
                      <button
                        onClick={() => removeMember(role.name, uid)}
                        className="rounded-full transition-opacity hover:opacity-70"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="max-w-xs flex-1 space-y-1.5">
                  <Label htmlFor={`add-${role.name}`}>Add member by user ID</Label>
                  <Input
                    id={`add-${role.name}`}
                    value={role.newMemberId}
                    onChange={(e) => patch(role.name, { newMemberId: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addMember(role)}
                    placeholder="identity UUID"
                    className="font-mono"
                  />
                </div>
                <Button size="sm" onClick={() => addMember(role)} disabled={!role.newMemberId.trim()}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
