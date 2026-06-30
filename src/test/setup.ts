// Minimal localStorage polyfill so the zustand `persist` store is importable
// under Vitest's node environment (tests don't rely on persistence).
class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  getItem(key: string): string | null {
    return this.m.has(key) ? this.m.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, String(value));
  }
  removeItem(key: string): void {
    this.m.delete(key);
  }
  clear(): void {
    this.m.clear();
  }
  key(i: number): string | null {
    return [...this.m.keys()][i] ?? null;
  }
}

if (!("localStorage" in globalThis)) {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
}
