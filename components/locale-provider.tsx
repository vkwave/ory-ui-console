"use client"

import { createContext, useContext } from "react"

import { translate, type Locale } from "@/lib/i18n"

const LocaleContext = createContext<Locale>("en")

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export const useLocale = (): Locale => useContext(LocaleContext)
export const useTranslate = () => {
  const locale = useLocale()
  return (key: string) => translate(locale, key)
}
