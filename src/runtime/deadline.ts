import { performance } from 'node:perf_hooks';
const maximumDelay = 2147483647;

/** Monotonic deadline; chunk long waits so Node never clamps them to one millisecond. */
export function createDeadline(timeoutMs: number, expire: () => void): () => void {
  const started = performance.now();
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function schedule(): void {
    if (!active) return;
    const remaining = timeoutMs - (performance.now() - started);
    if (remaining <= 0) {
      active = false;
      expire();
      return;
    }
    timer = globalThis.setTimeout(schedule, Math.min(remaining, maximumDelay));
  }
  schedule();
  return () => {
    active = false;
    globalThis.clearTimeout(timer);
  };
}
