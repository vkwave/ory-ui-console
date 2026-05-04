"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RevokeAllSessionsButton({ identityId }: { identityId: string }) {
  const router = useRouter();

  async function handleRevokeAll() {
    await fetch(`/api/kratos/identities/${identityId}/sessions`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleRevokeAll}>
      Revoke All
    </Button>
  );
}
