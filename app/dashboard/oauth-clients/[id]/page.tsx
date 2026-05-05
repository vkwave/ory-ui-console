import { hydra } from "@/lib/ory/hydra";
import { JsonViewer } from "@/components/json-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  let client = null;
  let error: string | null = null;
  try {
    client = await hydra.getClient(decodedId);
  } catch (e) {
    error = String(e);
  }

  if (error || !client) {
    return (
      <div>
        <PageHeader
          eyebrow="Hydra Client"
          title={<span className="break-all font-mono text-2xl">{decodedId}</span>}
          className="mb-6"
        />
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error ?? "Client not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hydra Client"
        title={<span className="break-all font-mono text-2xl">{decodedId}</span>}
        description="Review OAuth2 client settings, grant types, scopes, and raw Hydra metadata."
        className="mb-0"
      />

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="mt-1 font-medium">{client.client_name || "—"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Scope</p>
              <p className="mt-1 font-medium">{client.scope || "—"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Token Endpoint Auth</p>
              <p className="mt-1 font-medium">{client.token_endpoint_auth_method || "—"}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Grant Types</p>
            <div className="flex flex-wrap gap-1.5">
              {(client.grant_types ?? []).map((g) => (
                <Badge key={g} variant="secondary">{g}</Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Redirect URIs</span>
            <ul className="mt-2 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-3 text-muted-foreground">
              {(client.redirect_uris ?? []).map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raw JSON</CardTitle></CardHeader>
        <CardContent>
          <JsonViewer data={client} />
        </CardContent>
      </Card>
    </div>
  );
}
