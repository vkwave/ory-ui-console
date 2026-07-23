import { createHash, randomBytes } from "node:crypto"

export const randomURLSafe = (bytes = 32): string =>
  randomBytes(bytes).toString("base64url")

export const pkceChallenge = (verifier: string): string =>
  createHash("sha256").update(verifier, "ascii").digest("base64url")
