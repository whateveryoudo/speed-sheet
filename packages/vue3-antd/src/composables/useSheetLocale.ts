import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeSheetLocale, type SheetLocale } from '../i18n'

export function useSheetLocale(lang?: MaybeRefOrGetter<SheetLocale | string | undefined>) {
  const { t, locale } = useI18n()

  watch(
    () => normalizeSheetLocale(toValue(lang)),
    (next) => {
      locale.value = next
    },
    { immediate: true },
  )

  return { t, locale }
}
