import { hydra } from "@/lib/ory/hydra";
import { JsonViewer } from "@/components/json-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getJWKSets() {
  const results = await Promise.allSettled(
    hydra.KNOWN_JWK_SETS.map(async (set) => ({
      set,
      data: await hydra.getJWKSet(set),
    }))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<{ set: string; data: unknown }>).value);
}

export default async function JWKsPage() {
  const sets = await getJWKSets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">JWK Sets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          JSON Web Key Sets used by Hydra to sign tokens. <code className="font-mono bg-muted px-1 rounded">hydra.openid.id-token</code> signs OIDC ID tokens;{" "}
          <code className="font-mono bg-muted px-1 rounded">hydra.jwt.access-token</code> signs JWT access tokens (only present when Hydra is configured to issue JWTs).
        </p>
      </div>

      {sets.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No JWK sets accessible. Ensure Hydra is running at <code className="font-mono bg-muted px-1 rounded">HYDRA_ADMIN_URL</code>.
            </p>
          </CardContent>
        </Card>
      )}

      {sets.map(({ set, data }) => {
        const jwkData = data as { keys?: Array<{ kid: string; kty: string; alg: string }> };
        return (
          <Card key={set}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-base">
                {set}
                {jwkData?.keys && (
                  <Badge variant="secondary">{jwkData.keys.length} key{jwkData.keys.length !== 1 ? "s" : ""}</Badge>
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
