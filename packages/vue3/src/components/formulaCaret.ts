/**
 * 计算 contenteditable 元素内光标相对于纯文本的字符偏移量（0-based）
 */
export function getCaretCharacterOffset(root: HTMLElement): number {
  let caretOffset = 0
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0

  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return 0

  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(root)
  preCaretRange.setEnd(range.startContainer, range.startOffset)
  caretOffset = preCaretRange.toString().length
  return caretOffset
}

/**
 * 将光标定位到 contenteditable 元素内部指定的字符偏移量处
 */
export function setCaretCharacterOffset(root: HTMLElement, offset: number): void {
  const sel = window.getSelection()
  if (!sel) return

  let current = 0
  let targetNode: Node | null = null
  let targetOffset = 0

  function traverse(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0
      if (current + len >= offset) {
        targetNode = node
        targetOffset = Math.max(0, offset - current)
        return true
      }
      current += len
      return false
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      if (traverse(node.childNodes[i])) return true
    }
    return false
  }

  traverse(root)

  try {
    const range = document.createRange()
    if (targetNode) {
      const textLen = (targetNode as Text).length
      range.setStart(targetNode, Math.min(targetOffset, textLen))
    } else {
      range.selectNodeContents(root)
      range.collapse(false)
    }
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } catch {
    // 降级容错
  }
}
