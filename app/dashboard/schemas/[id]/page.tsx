import { kratos } from "@/lib/ory/kratos";
import { JsonViewer } from "@/components/json-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SchemaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  let schema: Record<string, unknown> | null = null;
  let error: string | null = null;
  try {
    const schemas = await kratos.listSchemas();
    const found = schemas.find((s) => s.id === decodedId);
    if (found) {
      const res = await fetch(found.url, { cache: "no-store" });
      schema = (await res.json()) as Record<string, unknown>;
    }
  } catch (e) {
    error = String(e);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Schema: {decodedId}</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {schema && (
        <Card>
          <CardHeader><CardTitle>Schema Definition</CardTitle></CardHeader>
          <CardContent>
            <JsonViewer data={schema} maxHeight="600px" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
