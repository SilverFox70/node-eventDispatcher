import { AsyncLocalStorage } from 'node:async_hooks';
import { FlowError } from '../errors.js';
export type TaskLease = { active: boolean };
/** Async descendants retain a revoked lease even when the outer process recovers. */
export function createTaskScope() {
  const storage = new AsyncLocalStorage<TaskLease>();
  return {
    run<T>(lease: TaskLease, handler: () => T): T { return storage.run(lease, handler); },
    guard(task = false): void {
      const lease = storage.getStore();
      if (!lease) return;
      throw new FlowError(!lease.active ? 'TASK_TERMINATED' : task ? 'TASK_ACTIVE' : 'TASK_IO_ACCESS');
    },
  };
}
export type TaskScope = ReturnType<typeof createTaskScope>;
