"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  async function handleRevoke() {
    await fetch(`/api/kratos/sessions/${sessionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleRevoke}>
      Revoke
    </Button>
  );
}
