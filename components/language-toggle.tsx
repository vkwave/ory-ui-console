"use client"

import { LanguagesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { translate, type Locale } from "@/lib/i18n"

export function LanguageToggle({ locale }: { locale: Locale }) {
  const nextLocale = locale === "en" ? "zh-CN" : "en"
  const label = translate(locale, "language.switch")

  const switchLocale = () => {
    document.cookie = `vkwave_console_lang=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={switchLocale}
      aria-label={label}
      title={label}
    >
      <LanguagesIcon />
    </Button>
  )
}
