export type Unsubscribe = () => void

/** Minimal pub/sub for framework adapters (Vue watch, React setState). */
export class Subscribable {
  private listeners = new Set<() => void>()

  subscribe(fn: () => void): Unsubscribe {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  notify(): void {
    for (const fn of this.listeners) fn()
  }
}
