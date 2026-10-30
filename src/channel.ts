import { FlowError } from './errors.js';

type Reader<T> = { resolve: (value: IteratorResult<T, undefined>) => void; reject: (error: Error) => void };
type Sender<T> = { value: T; resolve: () => void; reject: (error: Error) => void };

/** Internal FIFO; admission/identity/representation policy belongs to its caller. */
export function createChannel<T>(capacity: number) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new FlowError('INVALID_ARGUMENT', 'Channel capacity must be a positive safe integer');
  }
  const queue: T[] = [];
  let reader: Reader<T> | undefined;
  let sender: Sender<T> | undefined;
  let state: 'open' | 'closed' | 'aborted' = 'open';
  let sent = 0;
  let received = 0;
  let discarded = 0;

  return {
    send(value: T): Promise<void> {
      if (state === 'aborted') return Promise.reject(new FlowError('RUN_TERMINATED'));
      if (state === 'closed') return Promise.reject(new FlowError('CHANNEL_CLOSED'));
      if (sender) return Promise.reject(new FlowError('CONCURRENT_SEND'));
      if (reader) {
        const waiting = reader;
        reader = undefined;
        sent++; received++;
        waiting.resolve({ done: false, value });
        return Promise.resolve();
      }
      if (queue.length < capacity) {
        queue.push(value);
        sent++;
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => { sender = { value, resolve, reject }; });
    },

    receive(): Promise<IteratorResult<T, undefined>> {
      if (state === 'aborted') return Promise.reject(new FlowError('RUN_TERMINATED'));
      if (reader) return Promise.reject(new FlowError('CONCURRENT_READ'));
      if (queue.length > 0) {
        const value = queue.shift()!;
        received++;
        if (sender) {
          const waiting = sender;
          sender = undefined;
          queue.push(waiting.value);
          sent++;
          waiting.resolve();
        }
        return Promise.resolve({ done: false, value });
      }
      if (state === 'closed') return Promise.resolve({ done: true, value: undefined });
      return new Promise((resolve, reject) => { reader = { resolve, reject }; });
    },

    close(): void {
      if (state !== 'open') return;
      state = 'closed';
      if (reader) {
        const waiting = reader;
        reader = undefined;
        waiting.resolve({ done: true, value: undefined });
      }
    },

    abort(): void {
      if (state === 'aborted') return;
      state = 'aborted';
      discarded += queue.length;
      queue.length = 0;
      const pendingReader = reader;
      const pendingSender = sender;
      reader = undefined; sender = undefined;
      pendingReader?.reject(new FlowError('RUN_TERMINATED'));
      pendingSender?.reject(new FlowError('RUN_TERMINATED'));
    },

    stats() {
      return Object.freeze({
        capacity, queued: queue.length, pendingSend: sender !== undefined,
        pendingRead: reader !== undefined, sent, received, discarded,
        closed: state !== 'open', aborted: state === 'aborted'
      });
    }
  };
}
