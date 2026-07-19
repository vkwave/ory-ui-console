import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { UserRoles } from "@/app/dashboard/users/[id]/user-roles"
import { IdentityActions } from "@/app/dashboard/users/[id]/identity-actions"

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
  afterEach(cleanup)

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
})
