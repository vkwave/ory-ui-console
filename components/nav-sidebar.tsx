"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Shield,
  Database,
  Mail,
  Key,
  Lock,
  Network,
  Settings,
  LayoutDashboard,
  LogOut,
  Boxes,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OryLogo from "@/public/icon.svg";
import Image from "next/image";

const NAV = [
  {
    label: "Console",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Kratos",
    items: [
      { href: "/dashboard/users", label: "Users", icon: Users },
      { href: "/dashboard/sessions", label: "Sessions", icon: Shield },
      { href: "/dashboard/schemas", label: "Schemas", icon: Database },
      { href: "/dashboard/couriers", label: "Couriers", icon: Mail },
    ],
  },
  {
    label: "Hydra",
    items: [
      { href: "/dashboard/oauth-clients", label: "OAuth2 Clients", icon: Key },
      { href: "/dashboard/consents", label: "Consents", icon: Settings },
      { href: "/dashboard/jwks", label: "JWK Sets", icon: Lock },
    ],
  },
  {
    label: "Keto",
    items: [
      { href: "/dashboard/roles", label: "Roles", icon: UserCheck },
      { href: "/dashboard/relations", label: "Relations", icon: Network },
      { href: "/dashboard/permissions", label: "Permissions", icon: Shield },
    ],
  },
];

export function NavSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <nav
      className={cn(
        "glass-panel flex h-full  w-72 flex-col gap-5 border-white dark:border-neutral-400 px-4 py-5 lg:rounded-[2rem]",
        className,
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-2xl px-2"
      >
        <span className="flex size-10 items-center justify-center rounded-2xl  text-primary-foreground shadow-sm">
          {/* <Boxes className="size-5" /> */}
          <Image src={OryLogo} alt="ory-logo" className="size-10" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight">
            Ory Console
          </span>
          <span className="text-xs text-muted-foreground">
            Identity, OAuth2, AuthZ
          </span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {NAV.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(`${href}/`));
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
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <Button
        onClick={logout}
        variant="ghost"
        className="h-10 justify-start gap-3 rounded-xl px-3 text-muted-foreground hover:bg-muted/55 hover:text-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </nav>
  );
}
