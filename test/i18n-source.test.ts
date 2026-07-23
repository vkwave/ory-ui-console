// @vitest-environment node

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { translate } from "@/lib/i18n"

describe("dashboard localization contracts", () => {
  it("localizes the dashboard header brand instead of hardcoding English", async () => {
    const source = await readFile(
      resolve(process.cwd(), "app/dashboard/layout.tsx"),
      "utf8",
    )

    expect(source).toContain('translate(locale, "brand.name")')
    expect(source).not.toMatch(/>\s*VKWAVE Auth Console\s*</)
  })

  it("localizes the MCP lifecycle hint in both supported languages", async () => {
    const source = await readFile(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    )

    expect(translate("en", "dashboard.mcpHint")).toBe("MCP client lifecycle")
    expect(translate("zh-CN", "dashboard.mcpHint")).toBe("MCP 客户端生命周期")
    expect(source).toContain('t("dashboard.mcpHint")')
  })

  it("localizes session revocation feedback in both supported languages", () => {
    expect(translate("en", "sessions.revokeAll")).toBe("Revoke all")
    expect(translate("en", "sessions.working")).toBe("Working…")
    expect(translate("en", "sessions.revokeFailed")).toBe(
      "Session revocation failed",
    )
    expect(translate("zh-CN", "sessions.revokeAll")).toBe("全部撤销")
    expect(translate("zh-CN", "sessions.working")).toBe("处理中…")
    expect(translate("zh-CN", "sessions.revokeFailed")).toBe("会话撤销失败")
  })
})
