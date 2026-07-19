import { ShieldCheckIcon } from "lucide-react"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { translate } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n-server"

interface LoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  const showError = typeof error === "string"
  const locale = await getLocale().catch(() => "en" as const)
  const t = (key: string) => translate(locale, key)

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("brand.loginTitle")}</CardTitle>
          <CardDescription>{t("brand.loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {showError ? (
            <Alert variant="destructive">
              <ShieldCheckIcon />
              <AlertTitle>{t("login.providerErrorTitle")}</AlertTitle>
              <AlertDescription>{t("login.providerErrorDescription")}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("login.noPassword")}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            render={<Link href="/api/auth/start" />}
            nativeButton={false}
          >
            <ShieldCheckIcon data-icon="inline-start" />
            {t("login.continue")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
