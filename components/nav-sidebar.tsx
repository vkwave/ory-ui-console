"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users, Shield, Database, Mail, Key, Lock,
  Network, Settings, LayoutDashboard, LogOut
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/sessions", label: "Sessions", icon: Shield },
  { href: "/dashboard/schemas", label: "Schemas", icon: Database },
  { href: "/dashboard/couriers", label: "Couriers", icon: Mail },
  { href: "/dashboard/oauth-clients", label: "OAuth2 Clients", icon: Key },
  { href: "/dashboard/consents", label: "Consents", icon: Settings },
  { href: "/dashboard/jwks", label: "JWK Sets", icon: Lock },
  { href: "/dashboard/relations", label: "Relations", icon: Network },
  { href: "/dashboard/permissions", label: "Permissions", icon: Shield },
];

export function NavSidebar() {
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <nav className="flex flex-col h-full w-56 border-r bg-card px-3 py-4 gap-1">
      <p className="px-3 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Ory Console
      </p>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <div className="mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
