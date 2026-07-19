import { ShieldAlertIcon } from "lucide-react"

import { ClientForm } from "@/app/dashboard/oauth-clients/client-form"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { checkOryHealth } from "@/lib/ory/health"

export const dynamic = "force-dynamic"

export default async function NewOAuthClientPage() {
  const health = await checkOryHealth().catch(() => ({ readOnly: true }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Hydra"
        title="New OAuth client"
        description="Register a confidential service or a native public client with exact redirects and least-privilege scopes."
        className="mb-0"
      />
      {health.readOnly ? (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Client creation is unavailable</AlertTitle>
          <AlertDescription>
            The console remains read-only until Hydra and Kratos are both
            healthy.
          </AlertDescription>
        </Alert>
      ) : (
        <ClientForm mode="create" />
      )}
    </div>
  )
}
