import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';

export async function watchdog(promise, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(Error('Missing barrier: ' + label)), 8000);
    })]);
  } finally { globalThis.clearTimeout(timer); }
}

export function supervise(database) {
  const workers = [];
  return {
    workers,
    spawn(name) {
      const child = fork(new globalThis.URL('./worker.mjs', import.meta.url), [], {
        env: { ...process.env, FBP_QUALIFICATION_DATABASE: database, FBP_QUALIFICATION_WORKER: name },
      });
      const exited = once(child, 'exit');
      const waiting = new Map();
      let sequence = 0;
      child.on('message', message => {
        const task = waiting.get(message.id);
        if (message.label) task?.barrier(message);
        else { task?.finish(message); waiting.delete(message.id); }
      });
      child.on('exit', () => {
        for (const task of waiting.values()) task.finish({ error: 'WORKER_EXITED' });
        waiting.clear();
      });
      const worker = {
        pid: child.pid,
        start(action) {
          const id = ++sequence;
          let barrier;
          const barrierResult = new Promise(resolve => { barrier = resolve; });
          const result = new Promise(finish => waiting.set(id, { finish, barrier }));
          child.send({ id, action });
          return {
            result, async barrier(label) {
              const message = await watchdog(Promise.race([barrierResult, result]), label);
              assert.equal(message.label, label);
              return message.data;
            },
            release() { child.send({ id, release: true }); },
          };
        },
        async call(action) {
          const message = await watchdog(worker.start(action).result, action.kind);
          if (message.error) throw Object.assign(Error(message.error), { code: message.error });
          return message.result;
        },
        async kill() {
          child.kill('SIGKILL');
          assert.deepEqual(await watchdog(exited, 'worker death'), [null, 'SIGKILL']);
        },
        async dispose() {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          await watchdog(exited, 'worker cleanup');
          assert.equal(waiting.size, 0);
        },
      };
      workers.push(worker);
      return worker;
    },
    async close() { await Promise.all(workers.map(worker => worker.dispose())); },
  };
}
