"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteIdentityButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/kratos/identities/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="sm">Delete</Button>}
      title="Delete identity"
      description={`Permanently delete user ${id}? This cannot be undone.`}
      onConfirm={handleDelete}
    />
  );
}
