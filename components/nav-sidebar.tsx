"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  DatabaseIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { translate, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const navGroups = [
  {
    label: "nav.console",
    items: [{ href: "/dashboard", label: "nav.overview", icon: LayoutDashboardIcon }],
  },
  {
    label: "nav.kratos",
    items: [
      { href: "/dashboard/users", label: "nav.users", icon: UsersIcon },
      { href: "/dashboard/sessions", label: "nav.sessions", icon: ShieldIcon },
      { href: "/dashboard/schemas", label: "nav.schemas", icon: DatabaseIcon },
      { href: "/dashboard/couriers", label: "nav.courier", icon: MailIcon },
    ],
  },
  {
    label: "nav.hydra",
    items: [
      {
        href: "/dashboard/oauth-clients",
        label: "nav.oauthClients",
        icon: KeyRoundIcon,
      },
      { href: "/dashboard/consents", label: "nav.consents", icon: SettingsIcon },
    ],
  },
] as const

export function NavSidebar({
  className,
  locale = "en",
}: {
  className?: string
  locale?: Locale
}) {
  const pathname = usePathname() ?? ""
  const t = (key: string) => translate(locale, key)

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <nav
      className={cn(
        "glass-panel flex h-full w-72 flex-col gap-5 border-white px-4 py-5 dark:border-neutral-400 lg:rounded-[2rem]",
        className,
      )}
    >
      <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-2">
        <Image src="/vkwave-mark.svg" alt="VKWAVE" width={40} height={40} />
        <span>
          <span className="block text-sm font-semibold tracking-tight">
            {t("brand.name")}
          </span>
          <span className="text-xs text-muted-foreground">{t("brand.tagline")}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t(group.label)}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(`${href}/`))
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/30",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                  )}
                >
                  <Icon />
                  <span>{t(label)}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
      <Button
        onClick={logout}
        variant="ghost"
        className="h-10 justify-start gap-3 rounded-xl px-3 text-muted-foreground hover:bg-muted/55 hover:text-foreground"
      >
        <LogOutIcon data-icon="inline-start" />
        {t("nav.signOut")}
      </Button>
    </nav>
  )
}
