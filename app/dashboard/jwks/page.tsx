import { hydra } from "@/lib/ory/hydra";
import { JsonViewer } from "@/components/json-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getJWKSets() {
  try {
    const sets = await hydra.listJWKSets();
    const results = await Promise.allSettled(
      (Array.isArray(sets) ? sets : []).map(async (s: string) => ({
        set: s,
        data: await hydra.getJWKSet(s),
      }))
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ set: string; data: unknown }>).value);
  } catch {
    return [];
  }
}

export default async function JWKsPage() {
  const sets = await getJWKSets();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">JWK Sets</h1>
      {sets.length === 0 && (
        <p className="text-muted-foreground">No JWK sets found or Hydra unavailable.</p>
      )}
      {sets.map(({ set, data }) => {
        const jwkData = data as { keys?: Array<{ kid: string; kty: string; alg: string }> };
        return (
          <Card key={set}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {set}
                {jwkData?.keys && (
                  <Badge variant="secondary">{jwkData.keys.length} keys</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jwkData?.keys && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {jwkData.keys.map((k) => (
                    <Badge key={k.kid} variant="outline" className="font-mono text-xs">
                      {k.kid} ({k.kty}/{k.alg})
                    </Badge>
                  ))}
                </div>
              )}
              <JsonViewer data={data} maxHeight="300px" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
