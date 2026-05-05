"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export default function PermissionsPage() {
  const [form, setForm] = useState({
    namespace: "permissions",
    object: "",
    relation: "granted",
    subject_id: "",
  });
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const params = new URLSearchParams(form);
      const res = await fetch(`/api/keto/permissions?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      const data = await res.json();
      setResult(data.allowed);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  const fields: Array<{ key: keyof typeof form; label: string; placeholder: string }> = [
    { key: "namespace", label: "Namespace", placeholder: "permissions" },
    { key: "object", label: "Object (permission)", placeholder: "create_post" },
    { key: "relation", label: "Relation", placeholder: "granted" },
    { key: "subject_id", label: "Subject ID", placeholder: "identity UUID" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Keto"
        title="Permission Check"
        description="Ask Keto whether a subject has a relation on a protected object."
        className="mb-0"
      />

      <Card>
        <CardHeader><CardTitle className="text-base">How Keto Permissions Work</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <p>
            Ory Keto implements the <strong>Zanzibar</strong> model: every permission is a relation tuple{" "}
            <code className="font-mono bg-muted px-1 rounded">(namespace, object, relation, subject)</code>.
            A permission check asks: <em>&quot;Does subject X have relation Y on object Z in namespace N?&quot;</em>
          </p>
          <div>
            <p className="font-medium text-foreground mb-1">Example tuples (created in Relations):</p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs">
              <li>permissions / create_post / granted / &lt;user-uuid&gt;</li>
              <li>permissions / delete_post / granted / &lt;admin-uuid&gt;</li>
              <li>roles / editor / member / &lt;user-uuid&gt;</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">To check if a user can create a post:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Namespace: <code className="font-mono bg-muted px-1 rounded">permissions</code></li>
              <li>Object: <code className="font-mono bg-muted px-1 rounded">create_post</code></li>
              <li>Relation: <code className="font-mono bg-muted px-1 rounded">granted</code></li>
              <li>Subject ID: the user&apos;s Kratos identity UUID</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Check Permission</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`permission-${key}`}>{label}</Label>
                <Input
                  id={`permission-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  onKeyDown={(e) => e.key === "Enter" && check()}
                />
              </div>
            ))}
          </div>
          <Button onClick={check} disabled={loading}>
            {loading ? "Checking..." : "Check"}
          </Button>
          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {result !== null && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
              <span className="font-medium">Result:</span>
              <Badge variant={result ? "default" : "destructive"}>
                {result ? "ALLOWED" : "DENIED"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
