import { render, screen } from "@testing-library/react"
import type { ComponentPropsWithoutRef } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("next/link", () => ({
  default: (props: ComponentPropsWithoutRef<"a">) => (
    <a data-next-link="true" {...props} />
  ),
}))

import LoginPage from "@/app/login/page"

describe("administrator login page", () => {
  it("offers only Hydra sign-in and no static credential form", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) })
    render(page)

    expect(screen.getByText("VKWAVE Authentication Console")).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Continue with VKWAVE" }),
    ).toHaveAttribute("href", "/api/auth/start")
    expect(
      screen.getByRole("button", { name: "Continue with VKWAVE" }),
    ).not.toHaveAttribute("data-next-link")
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })
})
