import { kratos } from "@/lib/ory/kratos";
import { hydra } from "@/lib/ory/hydra";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Key, Shield, Mail } from "lucide-react";

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
    { label: "Total Users", value: stats.identities, icon: Users },
    { label: "Active Sessions", value: stats.sessions, icon: Shield },
    { label: "OAuth2 Clients", value: stats.clients, icon: Key },
    { label: "Courier Messages", value: stats.messages, icon: Mail },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
