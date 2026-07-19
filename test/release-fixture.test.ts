// @vitest-environment node

import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

describe("first release CIMD fixture", () => {
  it("uses the immutable versioned raw GitHub URL as its client ID", async () => {
    const fixture = JSON.parse(
      await readFile(
        new URL("./fixtures/cimd/integration-client.json", import.meta.url),
        "utf8",
      ),
    )

    expect(fixture.client_id).toBe(
      "https://raw.githubusercontent.com/vkwave/ory-ui-console/1.0.0-vkwave.1/test/fixtures/cimd/integration-client.json",
    )
    expect(fixture.token_endpoint_auth_method).toBe("none")
    expect(fixture.redirect_uris).toEqual([
      "http://127.0.0.1:37123/callback",
    ])
  })
})
