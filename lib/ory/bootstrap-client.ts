import { Configuration, IdentityApi } from "@ory/client"

const bootstrapURL = (value: string | undefined): URL => {
  if (!value) throw new Error("KRATOS_ADMIN_URL is required")
  const url = new URL(value)
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("KRATOS_ADMIN_URL must be a plain HTTP(S) origin")
  }
  return url
}

export const createBootstrapIdentityClient = (
  env: Readonly<Record<string, string | undefined>> = process.env,
): IdentityApi => {
  const basePath = bootstrapURL(env.KRATOS_ADMIN_URL)
  return new IdentityApi(
    new Configuration({
      basePath: basePath.href.replace(/\/$/, ""),
      baseOptions: { timeout: 5_000 },
    }),
  )
}
