import { Extension } from '../Extension'

export const KeyboardExtension = Extension.create({
  name: 'keyboard',
  priority: -100,

  addKeyboardShortcuts() {
    return {
      // Arrow keys, Enter, Tab — handled by the UI renderer
    }
  },
})
