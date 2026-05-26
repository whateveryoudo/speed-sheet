import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import zh from '../locales/zh.json'

export type SheetLocale = 'zh' | 'en'

export type SheetMessages = typeof zh

/** 仅支持 zh / en，其它 lang 回退到 zh */
export function normalizeSheetLocale(lang?: string): SheetLocale {
  return lang === 'en' ? 'en' : 'zh'
}

export const sheetI18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages: { zh, en },
})

export type SheetT = typeof sheetI18n.global.t

export function setSheetLocale(locale: SheetLocale): void {
  ;(sheetI18n.global.locale as { value: SheetLocale }).value = locale
}

export function installSheetI18n(app: App, locale?: SheetLocale): void {
  app.use(sheetI18n)
  if (locale) {
    setSheetLocale(locale)
  }
}
