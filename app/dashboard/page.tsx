import {
  ActivityIcon,
  KeyRoundIcon,
  MailIcon,
  ServerCogIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth/require-admin"
import { translate } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n-server"
import { hydra } from "@/lib/ory/hydra"
import { kratos } from "@/lib/ory/kratos"

const getStats = async () => {
  const [identities, sessions, clients, messages] = await Promise.allSettled([
    kratos.listIdentities(1, 1000),
    kratos.listSessions(1, 1000),
    hydra.listClients(1, 1000),
    kratos.listMessages(1, 1000),
  ])
  return {
    identities: identities.status === "fulfilled" ? identities.value.length : "—",
    sessions: sessions.status === "fulfilled" ? sessions.value.length : "—",
    clients: clients.status === "fulfilled" ? clients.value.length : "—",
    messages: messages.status === "fulfilled" ? messages.value.length : "—",
  }
}

export default async function DashboardPage() {
  await requireAdmin(false)
  const [locale, stats] = await Promise.all([getLocale(), getStats()])
  const t = (key: string) => translate(locale, key)
  const cards = [
    {
      label: t("dashboard.users"),
      value: stats.identities,
      icon: UsersIcon,
      hint: t("dashboard.kratosHint"),
    },
    {
      label: t("dashboard.sessions"),
      value: stats.sessions,
      icon: ShieldIcon,
      hint: t("dashboard.sessionsHint"),
    },
    {
      label: t("dashboard.clients"),
      value: stats.clients,
      icon: KeyRoundIcon,
      hint: t("dashboard.clientsHint"),
    },
    {
      label: t("dashboard.messages"),
      value: stats.messages,
      icon: MailIcon,
      hint: t("dashboard.messagesHint"),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("nav.overview")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        className="mb-0"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                {label}
                <Icon className="size-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>{hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-muted-foreground" />
              {t("dashboard.operations")}
            </CardTitle>
            <CardDescription>{t("dashboard.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-medium">Kratos</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.kratosHint")}</p>
            </div>
            <div>
              <p className="font-medium">Hydra</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.clientsHint")}</p>
            </div>
            <div>
              <p className="font-medium">MCP OAuth Adapter</p>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.mcpHint")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCogIcon className="size-4 text-muted-foreground" />
              {t("dashboard.environment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>{t("dashboard.serverFetch")}</p>
            <p>{t("dashboard.clientRoutes")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
