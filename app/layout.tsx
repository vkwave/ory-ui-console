import type { Metadata } from "next"

import { LocaleProvider } from "@/components/locale-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { getLocale } from "@/lib/i18n-server"

import "./globals.css"

export const metadata: Metadata = {
  title: "VKWAVE Auth Console",
  description: "VKWAVE administrator console for Kratos, Hydra, and MCP",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <html lang={locale === "zh-CN" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body>
        <LocaleProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
