export class DuplicateGuard {
  constructor({ ttlMs = 5 * 60 * 1000, maxEntries = 5_000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  claim(key, nowMs = Date.now()) {
    for (const [candidate, expiresAt] of this.entries) {
      if (expiresAt <= nowMs) this.entries.delete(candidate);
    }
    if (this.entries.has(key)) return false;
    if (this.entries.size >= this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
    this.entries.set(key, nowMs + this.ttlMs);
    return true;
  }
}

