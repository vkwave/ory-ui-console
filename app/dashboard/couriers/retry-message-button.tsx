"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RetryMessageButton({ messageId, isSent }: { messageId: string; isSent: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kratos/messages/${messageId}/deliver`, { method: "PATCH" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleRetry} disabled={loading || isSent}>
      {loading ? "…" : "Retry"}
    </Button>
  );
}
