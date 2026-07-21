// @vitest-environment node

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const dashboardReads = [
  "app/dashboard/layout.tsx",
  "app/dashboard/page.tsx",
  "app/dashboard/sessions/page.tsx",
  "app/dashboard/schemas/page.tsx",
  "app/dashboard/schemas/[id]/page.tsx",
  "app/dashboard/oauth-clients/page.tsx",
  "app/dashboard/oauth-clients/[id]/page.tsx",
  "app/dashboard/oauth-clients/new/page.tsx",
  "app/dashboard/users/page.tsx",
  "app/dashboard/users/[id]/page.tsx",
  "app/dashboard/couriers/page.tsx",
]

describe("dashboard read authorization", () => {
  it("rechecks the administrator session before each server-rendered dashboard read", async () => {
    for (const file of dashboardReads) {
      const source = await readFile(resolve(process.cwd(), file), "utf8")

      expect(source, file).toContain('from "@/lib/auth/require-admin"')
      expect(source, file).toContain("await requireAdmin(false)")
    }
  })
})
