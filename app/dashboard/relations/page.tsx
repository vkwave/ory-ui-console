"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RelationTuple } from "@/lib/ory/keto";

const EMPTY_TUPLE: RelationTuple = {
  namespace: "roles",
  object: "user",
  relation: "member",
  subject_id: "",
};

export default function RelationsPage() {
  const [filter, setFilter] = useState({ namespace: "roles", relation: "", subject_id: "" });
  const [tuples, setTuples] = useState<RelationTuple[]>([]);
  const [newTuple, setNewTuple] = useState<RelationTuple>(EMPTY_TUPLE);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ namespace: filter.namespace });
      if (filter.relation) params.set("relation", filter.relation);
      if (filter.subject_id) params.set("subject_id", filter.subject_id);
      const res = await fetch(`/api/keto/relations?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTuples(data.relation_tuples ?? []);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  async function createRelation() {
    setError("");
    try {
      const res = await fetch("/api/keto/relations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTuple),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      await search();
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteRelation(tuple: RelationTuple) {
    setError("");
    try {
      const res = await fetch("/api/keto/relations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tuple),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      await search();
    } catch (e) {
      setError(String(e));
    }
  }

  const columns: Column<RelationTuple>[] = [
    { key: "namespace", header: "Namespace", cell: (t) => t.namespace },
    { key: "object", header: "Object", cell: (t) => t.object },
    { key: "relation", header: "Relation", cell: (t) => t.relation },
    { key: "subject", header: "Subject", cell: (t) => t.subject_id ?? JSON.stringify(t.subject_set) },
    {
      key: "delete",
      header: "",
      cell: (t) => (
        <Button variant="destructive" size="sm" onClick={() => deleteRelation(t)}>Delete</Button>
      ),
    },
  ];

  const filterFields: Array<{ key: keyof typeof filter; label: string; placeholder: string }> = [
    { key: "namespace", label: "Namespace", placeholder: "roles" },
    { key: "relation", label: "Relation", placeholder: "member" },
    { key: "subject_id", label: "Subject ID", placeholder: "identity UUID" },
  ];

  const tupleFields: Array<{ key: keyof RelationTuple; label: string }> = [
    { key: "namespace", label: "Namespace" },
    { key: "object", label: "Object" },
    { key: "relation", label: "Relation" },
    { key: "subject_id", label: "Subject ID" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Keto Relations</h1>

      <Card>
        <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          {filterFields.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={filter[key]}
                onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-36"
              />
            </div>
          ))}
          <Button onClick={search} disabled={loading}>{loading ? "…" : "Search"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add Relation</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          {tupleFields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={String(newTuple[key] ?? "")}
                onChange={(e) => setNewTuple({ ...newTuple, [key]: e.target.value })}
                className="w-36"
              />
            </div>
          ))}
          <Button onClick={createRelation}>Add</Button>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <DataTable
        columns={columns}
        data={tuples}
        keyExtractor={(t, i) => `${t.namespace}:${t.object}:${t.relation}:${t.subject_id ?? i}`}
        emptyMessage="No relations found. Run a search first."
      />
    </div>
  );
}
