/** A simple in-memory replacement for LocalStorage, for tests. */
export class MemoryStorage implements Storage {
  private items = new Map<string, string>()
  /** Set to true to simulate a full or blocked storage. */
  failWrites = false

  get length() {
    return this.items.size
  }

  clear() {
    this.items.clear()
  }

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.items.set(key, String(value))
  }
}
