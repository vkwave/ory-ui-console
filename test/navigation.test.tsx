import { render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { NavSidebar } from "@/components/nav-sidebar"

describe("VKWAVE navigation", () => {
  afterEach(cleanup)

  it("keeps only curated navigation in English", () => {
    render(<NavSidebar locale="en" />)

    expect(screen.getByText("VKWAVE Auth Console")).toBeInTheDocument()
    expect(screen.getByText("OAuth Clients")).toBeInTheDocument()
    expect(screen.getByText("Users")).toBeInTheDocument()
    expect(screen.getByText("Sessions")).toBeInTheDocument()
    expect(screen.getByText("Consents")).toBeInTheDocument()
    expect(screen.getByText("Schemas")).toBeInTheDocument()
    expect(screen.getByText("Courier")).toBeInTheDocument()
    expect(screen.queryByText("Keto")).not.toBeInTheDocument()
    expect(screen.queryByText("JWK Sets")).not.toBeInTheDocument()
    expect(screen.queryByText("Relations")).not.toBeInTheDocument()
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument()
    expect(screen.queryByText("Roles")).not.toBeInTheDocument()
  })

  it("renders the same curated surface in Simplified Chinese", () => {
    render(<NavSidebar locale="zh-CN" />)

    expect(screen.getByText("VKWAVE 认证控制台")).toBeInTheDocument()
    expect(screen.getByText("OAuth 客户端")).toBeInTheDocument()
    expect(screen.getByText("用户")).toBeInTheDocument()
    expect(screen.getByText("会话")).toBeInTheDocument()
    expect(screen.getByText("授权同意")).toBeInTheDocument()
    expect(screen.getByText("身份 Schema")).toBeInTheDocument()
    expect(screen.getByText("邮件队列")).toBeInTheDocument()
    expect(screen.queryByText("Keto")).not.toBeInTheDocument()
  })
})
