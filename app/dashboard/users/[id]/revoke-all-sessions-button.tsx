"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RevokeAllSessionsButton({ identityId }: { identityId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevokeAll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kratos/identities/${identityId}/sessions`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleRevokeAll} disabled={loading}>
      {loading ? "…" : "Revoke All"}
    </Button>
  );
}
