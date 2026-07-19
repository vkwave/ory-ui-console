import { ShieldCheckIcon } from "lucide-react"

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

interface LoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  const showError = typeof error === "string"

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>VKWAVE Authentication Console</CardTitle>
          <CardDescription>
            Sign in through VKWAVE and complete AAL2 verification to administer
            the authentication stack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showError ? (
            <Alert variant="destructive">
              <ShieldCheckIcon />
              <AlertTitle>Authentication could not be completed</AlertTitle>
              <AlertDescription>
                Start the secure sign-in flow again. Provider details are not
                shown here.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              The console never accepts or stores a separate administrator
              password.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            render={<a href="/api/auth/start" />}
            nativeButton={false}
          >
            <ShieldCheckIcon data-icon="inline-start" />
            Continue with VKWAVE
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
