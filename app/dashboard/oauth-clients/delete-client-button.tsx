"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(`/api/hydra/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Failed: ${res.status}`);
    }
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="sm">Delete</Button>}
      title="Delete OAuth2 client"
      description={`Permanently delete client "${clientId}"?`}
      onConfirm={handleDelete}
    />
  );
}
