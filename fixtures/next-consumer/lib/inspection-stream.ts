import type { InspectionSnapshot } from 'event-driven-design/model';

type Inventory = {
  snapshot(): InspectionSnapshot;
  subscribe(listener: () => void): () => void;
  advance(): boolean;
  dispose(): void;
};

/** At most one buffered frame and one coalesced pending frame; resources belong to this request. */
export function openInspectionStream(inventory: Inventory, signal: AbortSignal, session: string,
  { intervalMs = 1000, leaseMs = 60000 } = {}) {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let pending: Uint8Array | null = null;
  let closed = false, sequence = 0;
  let remove = () => {};
  let interval: ReturnType<typeof setInterval>;
  let lease: ReturnType<typeof setTimeout>;
  const finish = (close = true) => {
    if (closed) return;
    closed = true;
    remove(); clearInterval(interval); clearTimeout(lease);
    signal.removeEventListener('abort', abort);
    inventory.dispose(); pending = null;
    console.info('FBP_INSPECTION_CLOSED ' + session);
    if (close) controller.close();
  };
  const abort = () => finish();
  const publish = () => {
    if (closed) return;
    try {
      const data = new TextEncoder().encode(`retry: 1500\nid: ${session}:${++sequence}\ndata: ${JSON.stringify({ sequence, snapshot: inventory.snapshot() })}\n\n`);
      if (controller.desiredSize! > 0) { pending = null; controller.enqueue(data); }
      else pending = data;
    } catch {
      finish(false); controller.error(Error('Inspection unavailable'));
    }
  };
  return new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
      remove = inventory.subscribe(publish);
      interval = setInterval(() => { if (!inventory.advance()) clearInterval(interval); }, intervalMs);
      lease = setTimeout(finish, leaseMs);
      signal.addEventListener('abort', abort, { once: true });
      console.info('FBP_INSPECTION_OPEN ' + session);
      if (signal.aborted) finish();
      else publish();
    },
    pull() {
      if (pending) { controller.enqueue(pending); pending = null; }
    },
    cancel() { finish(false); }
  }, { highWaterMark: 1 });
}
