import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export const PROTECTION_MANAGE_KEY: InjectionKey<{
  open: Ref<boolean>
  openModal: () => void
  closeModal: () => void
}> = Symbol('speed-sheet-protection-manage')

export function provideProtectionManage() {
  const open = ref(false)
  const api = {
    open,
    openModal: () => {
      open.value = true
    },
    closeModal: () => {
      open.value = false
    },
  }
  provide(PROTECTION_MANAGE_KEY, api)
  return api
}

export function useProtectionManageOptional() {
  return inject(PROTECTION_MANAGE_KEY, null)
}
