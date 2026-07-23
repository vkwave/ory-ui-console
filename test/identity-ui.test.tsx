import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  mutateConsole: vi.fn(),
}))

vi.mock("@/app/dashboard/oauth-clients/mutation", () => ({
  mutateConsole: mocks.mutateConsole,
}))

import { UserRoles } from "@/app/dashboard/users/[id]/user-roles"
import {
  IdentityActions,
  RevokeAllSessionsButton,
} from "@/app/dashboard/users/[id]/identity-actions"
import { LocaleProvider } from "@/components/locale-provider"

describe("identity role UI", () => {
  afterEach(cleanup)
  it("renders only the closed administrator role set from Kratos metadata", () => {
    render(
      <UserRoles
        identityID="identity-1"
        initialRoles={["auth_admin"]}
        readOnly={false}
      />,
    )

    expect(
      screen.getByRole("checkbox", { name: "Authentication administrator" }),
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: "Security operator" }),
    ).not.toBeChecked()
    expect(screen.queryByText(/Create roles/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Save roles" }),
    ).toBeInTheDocument()
  })

  it("disables role changes while the ORY stack is degraded", () => {
    render(
      <UserRoles
        identityID="identity-1"
        initialRoles={["auth_admin"]}
        readOnly
      />,
    )

    expect(
      screen.getByRole("checkbox", { name: "Authentication administrator" }),
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save roles" })).toBeDisabled()
  })
})

describe("identity action UI", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders state and typed deletion controls only when writable", () => {
    render(
      <IdentityActions
        identityID="identity-1"
        state="active"
        readOnly={false}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Deactivate identity" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Delete identity" }),
    ).toBeInTheDocument()
  })

  it("renders no destructive controls while read-only", () => {
    render(
      <IdentityActions
        identityID="identity-1"
        state="active"
        readOnly
      />,
    )

    expect(
      screen.queryByRole("button", { name: "Delete identity" }),
    ).not.toBeInTheDocument()
  })

  it("shows a bounded failure when revoking all sessions fails", async () => {
    mocks.mutateConsole.mockRejectedValueOnce(new Error("session_revoke_failed"))
    render(
      <RevokeAllSessionsButton identityID="identity-1" readOnly={false} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Revoke all" }))

    expect(await screen.findByText("session_revoke_failed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Revoke all" })).toBeEnabled()
  })

  it("localizes the revoke-all action and pending state", async () => {
    mocks.mutateConsole.mockImplementationOnce(() => new Promise(() => {}))
    render(
      <LocaleProvider locale="zh-CN">
        <RevokeAllSessionsButton identityID="identity-1" readOnly={false} />
      </LocaleProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "全部撤销" }))

    const pendingLabel = await screen.findByText("处理中…")
    expect(pendingLabel.closest("button")).toBeDisabled()
  })
})
