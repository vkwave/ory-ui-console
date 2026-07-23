import { LanguageToggle } from "@/components/language-toggle"
import { NavSidebar } from "@/components/nav-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { requireAdmin } from "@/lib/auth/require-admin"
import { translate } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n-server"
import { MenuIcon } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin(false)
  const locale = await getLocale()
  return <DashboardShell locale={locale}>{children}</DashboardShell>
}

function DashboardShell({
  locale,
  children,
}: {
  locale: "en" | "zh-CN"
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-2 z-30 hidden py-2 lg:block">
        <NavSidebar locale={locale} />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="glass-control lg:hidden"
                    aria-label="Open navigation"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 border-r-0 bg-transparent p-0"
                showCloseButton={false}
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <NavSidebar locale={locale} className="w-full rounded-none border-r-0" />
              </SheetContent>
            </Sheet>
            <div className="hidden text-sm text-muted-foreground lg:block">
              {translate(locale, "brand.name")}
            </div>
            <div className="flex items-center gap-1">
              <LanguageToggle locale={locale} />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
