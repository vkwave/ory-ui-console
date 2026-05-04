"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <h1 className="text-2xl font-bold">Permission Check</h1>

      <Card>
        <CardHeader><CardTitle>Check Permission</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  onKeyDown={(e) => e.key === "Enter" && check()}
                />
              </div>
            ))}
          </div>
          <Button onClick={check} disabled={loading}>
            {loading ? "Checking…" : "Check"}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {result !== null && (
            <div className="flex items-center gap-2 mt-2">
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
