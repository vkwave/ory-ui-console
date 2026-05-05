import { kratos } from "@/lib/ory/kratos";
import { hydra } from "@/lib/ory/hydra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Users, Key, Shield, Mail, Activity, ServerCog } from "lucide-react";

async function getStats() {
  const [identities, sessions, clients, messages] = await Promise.allSettled([
    kratos.listIdentities(1, 1000),
    kratos.listSessions(1, 1000),
    hydra.listClients(1, 1000),
    kratos.listMessages(1, 1000),
  ]);

  return {
    identities: identities.status === "fulfilled" ? identities.value.length : "—",
    sessions: sessions.status === "fulfilled" ? sessions.value.length : "—",
    clients: clients.status === "fulfilled" ? clients.value.length : "—",
    messages: messages.status === "fulfilled" ? messages.value.length : "—",
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Users", value: stats.identities, icon: Users, hint: "Kratos identities" },
    { label: "Active Sessions", value: stats.sessions, icon: Shield, hint: "Current session records" },
    { label: "OAuth2 Clients", value: stats.clients, icon: Key, hint: "Hydra client registry" },
    { label: "Courier Messages", value: stats.messages, icon: Mail, hint: "Recent delivery queue" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Ory Stack Dashboard"
        description="A focused control surface for identity, OAuth2 clients, consent state, and authorization checks."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <span className="rounded-xl border border-border/60 bg-muted/30 p-2 text-muted-foreground">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="font-medium text-foreground">Kratos</p>
              <p className="mt-1">Inspect identities, sessions, schemas, and courier activity.</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="font-medium text-foreground">Hydra</p>
              <p className="mt-1">Review OAuth2 clients, consent sessions, and JWK material.</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="font-medium text-foreground">Keto</p>
              <p className="mt-1">Manage relation tuples and verify permission decisions.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-4 text-muted-foreground" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Server-side pages fetch directly from configured Ory admin endpoints.</p>
            <p>Client-side tools use local API routes, preserving session and integration boundaries.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
