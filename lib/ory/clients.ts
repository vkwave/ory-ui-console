import "server-only"

import {
  Configuration,
  CourierApi,
  IdentityApi,
  JwkApi,
  OAuth2Api,
} from "@ory/client"

import { loadConfig } from "@/lib/config"

export interface OryClients {
  hydraAdmin: OAuth2Api
  hydraJWK: JwkApi
  kratosIdentities: IdentityApi
  kratosCourier: CourierApi
}

const configuration = (basePath: URL): Configuration =>
  new Configuration({
    basePath: basePath.href.replace(/\/$/, ""),
    baseOptions: { timeout: 5_000 },
  })

export const createOryClients = (
  env: NodeJS.ProcessEnv = process.env,
): OryClients => {
  const config = loadConfig(env)
  const hydra = configuration(config.hydraAdminURL)
  const kratos = configuration(config.kratosAdminURL)

  return {
    hydraAdmin: new OAuth2Api(hydra),
    hydraJWK: new JwkApi(hydra),
    kratosIdentities: new IdentityApi(kratos),
    kratosCourier: new CourierApi(kratos),
  }
}

let clients: OryClients | undefined

export const getOryClients = (): OryClients => {
  clients ??= createOryClients()
  return clients
}
