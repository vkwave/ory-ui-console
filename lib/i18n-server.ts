import "server-only"

import { cookies } from "next/headers"

import { isLocale, type Locale } from "@/lib/i18n"

export const getLocale = async (): Promise<Locale> => {
  const value = (await cookies()).get("vkwave_console_lang")?.value
  return isLocale(value) ? value : "en"
}
