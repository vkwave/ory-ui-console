export type Locale = "en" | "zh-CN"

type Dictionary = Record<string, string>

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    "brand.name": "VKWAVE Auth Console",
    "brand.tagline": "Kratos, Hydra, and MCP administration",
    "brand.loginTitle": "VKWAVE Authentication Console",
    "brand.loginDescription": "Sign in through VKWAVE and complete AAL2 verification to administer the authentication stack.",
    "login.providerErrorTitle": "Authentication could not be completed",
    "login.providerErrorDescription": "Start the secure sign-in flow again. Provider details are not shown here.",
    "login.noPassword": "The console never accepts or stores a separate administrator password.",
    "login.continue": "Continue with VKWAVE",
    "dashboard.title": "VKWAVE Auth Dashboard",
    "dashboard.description": "A focused control surface for identity, OAuth clients, consent state, and MCP administration.",
    "dashboard.users": "Total users",
    "dashboard.sessions": "Active sessions",
    "dashboard.clients": "OAuth clients",
    "dashboard.messages": "Courier messages",
    "dashboard.kratosHint": "Kratos identities",
    "dashboard.sessionsHint": "Current session records",
    "dashboard.clientsHint": "Hydra client registry",
    "dashboard.messagesHint": "Recent delivery metadata",
    "dashboard.mcpHint": "MCP client lifecycle",
    "dashboard.operations": "Operations",
    "dashboard.environment": "Environment",
    "dashboard.serverFetch": "Server-side pages use fixed ORY administrator endpoints.",
    "dashboard.clientRoutes": "Browser mutations use local routes with CSRF and audit boundaries.",
    "sessions.revokeAll": "Revoke all",
    "sessions.working": "Working…",
    "sessions.revokeFailed": "Session revocation failed",
    "sessions.revokeErrorDescription": "The sessions could not be revoked. Try again.",
    "nav.console": "Console",
    "nav.overview": "Overview",
    "nav.kratos": "Kratos",
    "nav.users": "Users",
    "nav.sessions": "Sessions",
    "nav.schemas": "Schemas",
    "nav.courier": "Courier",
    "nav.hydra": "Hydra",
    "nav.oauthClients": "OAuth Clients",
    "nav.consents": "Consents",
    "nav.signOut": "Sign out",
    "language.switch": "切换到中文",
  },
  "zh-CN": {
    "brand.name": "VKWAVE 认证控制台",
    "brand.tagline": "Kratos、Hydra 与 MCP 管理",
    "brand.loginTitle": "VKWAVE 认证控制台",
    "brand.loginDescription": "通过 VKWAVE 登录并完成 AAL2 验证，以管理认证堆栈。",
    "login.providerErrorTitle": "认证未完成",
    "login.providerErrorDescription": "请重新开始安全登录流程。此处不会显示提供方细节。",
    "login.noPassword": "控制台不会接受或存储独立的管理员密码。",
    "login.continue": "使用 VKWAVE 继续",
    "dashboard.title": "VKWAVE 认证仪表盘",
    "dashboard.description": "用于管理身份、OAuth 客户端、授权同意状态与 MCP 的专用控制面板。",
    "dashboard.users": "用户总数",
    "dashboard.sessions": "活跃会话",
    "dashboard.clients": "OAuth 客户端",
    "dashboard.messages": "邮件队列",
    "dashboard.kratosHint": "Kratos 身份",
    "dashboard.sessionsHint": "当前会话记录",
    "dashboard.clientsHint": "Hydra 客户端注册表",
    "dashboard.messagesHint": "最近邮件元数据",
    "dashboard.mcpHint": "MCP 客户端生命周期",
    "dashboard.operations": "运维组件",
    "dashboard.environment": "运行环境",
    "dashboard.serverFetch": "服务端页面使用固定的 ORY 管理端点。",
    "dashboard.clientRoutes": "浏览器 mutation 通过本地路由并经过 CSRF 与审计边界。",
    "sessions.revokeAll": "全部撤销",
    "sessions.working": "处理中…",
    "sessions.revokeFailed": "会话撤销失败",
    "sessions.revokeErrorDescription": "无法撤销会话，请重试。",
    "nav.console": "控制台",
    "nav.overview": "概览",
    "nav.kratos": "Kratos",
    "nav.users": "用户",
    "nav.sessions": "会话",
    "nav.schemas": "身份 Schema",
    "nav.courier": "邮件队列",
    "nav.hydra": "Hydra",
    "nav.oauthClients": "OAuth 客户端",
    "nav.consents": "授权同意",
    "nav.signOut": "退出登录",
    "language.switch": "Switch to English",
  },
}

export const isLocale = (value: string | undefined): value is Locale =>
  value === "en" || value === "zh-CN"

export const translate = (locale: Locale, key: string): string => {
  const value = dictionaries[locale][key]
  if (value) return value
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    throw new Error(`missing translation: ${locale}:${key}`)
  }
  return dictionaries.en[key] ?? key
}
