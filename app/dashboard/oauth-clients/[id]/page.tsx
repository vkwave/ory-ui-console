import { hydra } from "@/lib/ory/hydra";
import { JsonViewer } from "@/components/json-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-2xl font-bold mb-6">Client: <span className="font-mono">{decodedId}</span></h1>
        <p className="text-destructive">{error ?? "Client not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Client: <span className="font-mono">{decodedId}</span></h1>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="font-medium">Name: </span>{client.client_name || "—"}</div>
          <div>
            <span className="font-medium">Grant Types: </span>
            {(client.grant_types ?? []).map((g) => (
              <Badge key={g} variant="secondary" className="mr-1">{g}</Badge>
            ))}
          </div>
          <div>
            <span className="font-medium">Redirect URIs: </span>
            <ul className="mt-1 list-disc list-inside text-muted-foreground">
              {(client.redirect_uris ?? []).map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>
          <div><span className="font-medium">Scope: </span>{client.scope}</div>
          <div><span className="font-medium">Token Endpoint Auth: </span>{client.token_endpoint_auth_method}</div>
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
