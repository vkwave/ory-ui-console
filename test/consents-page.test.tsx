import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  mutateConsole: vi.fn(),
}))

vi.mock("@/app/dashboard/oauth-clients/mutation", () => ({
  mutateConsole: mocks.mutateConsole,
}))

import ConsentsPage from "@/app/dashboard/consents/page"

describe("consent session controls", () => {
  beforeEach(() => {
    mocks.mutateConsole.mockResolvedValue({ ok: true })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            consent_request_id: "consent-1",
            consent_request: {},
            grant_scope: ["openid"],
          },
        ]),
      ),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("does not turn a clientless consent row into a revoke-all request", async () => {
    render(<ConsentsPage />)

    fireEvent.change(screen.getByLabelText("Subject ID"), {
      target: { value: "identity-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Search" }))

    const revokeOne = await screen.findByRole("button", { name: "Revoke" })
    expect(revokeOne).toBeDisabled()
    fireEvent.click(revokeOne)
    expect(mocks.mutateConsole).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Revoke all" }))
    await waitFor(() =>
      expect(mocks.mutateConsole).toHaveBeenCalledWith("/api/hydra/consents", {
        method: "DELETE",
        body: { subject: "identity-1", client: undefined },
      }),
    )
  })
})
