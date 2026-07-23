import "server-only"

import { redirect } from "next/navigation"

import { loadConfig } from "@/lib/config"
import { getSession, type SessionData } from "@/lib/session"

import {
  resolveAdministrator,
  type Administrator,
} from "./roles"

interface GuardSession extends SessionData {
  destroy(): void
  save(): Promise<void>
}

interface GuardDependencies {
  env?: NodeJS.ProcessEnv
  getSession?: () => Promise<GuardSession>
  now?: () => number
  resolveAdministrator?: (
    subject: string,
    options: { env?: NodeJS.ProcessEnv },
  ) => Promise<Administrator>
}

export const requireAdmin = async (
  freshRole = false,
  overrides: GuardDependencies = {},
): Promise<NonNullable<SessionData["admin"]>> => {
  const config = loadConfig(overrides.env)
  const session = await (overrides.getSession ?? getSession)()
  if (!session.admin) redirect("/login")

  const now = overrides.now ?? Date.now
  const expired =
    now() - session.admin.roleCheckedAt > config.roleRecheckSeconds * 1_000
  if (freshRole || expired) {
    const resolver =
      overrides.resolveAdministrator ??
      ((subject: string, options: { env?: NodeJS.ProcessEnv }) =>
        resolveAdministrator(subject, options))
    try {
      const administrator = await resolver(session.admin.subject, {
        env: overrides.env,
      })
      session.admin.roles = administrator.roles
      session.admin.roleCheckedAt = now()
      await session.save()
    } catch (error) {
      session.destroy()
      throw error
    }
  }
  return session.admin
}
