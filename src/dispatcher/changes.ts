/** Bounded, coalesced observation; observers cannot affect synchronous event delivery. */
export function createTopologyChanges() {
  const observers = new Set<() => void>();
  let pending = false;
  return {
    subscribe(listener: () => void): () => void {
      if (typeof listener !== 'function') throw new TypeError('Topology observer must be a function');
      if (observers.size >= 64) throw new RangeError('Topology observer limit reached');
      // Each subscription owns its own identity, even when callbacks are equal.
      const observer = () => listener();
      observers.add(observer);
      return () => { observers.delete(observer); };
    },
    changed(): void {
      if (pending || observers.size === 0) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        for (const observer of [...observers]) {
          if (!observers.has(observer)) continue;
          try { observer(); }
          catch { observers.delete(observer); }
        }
      });
    }
  };
}
