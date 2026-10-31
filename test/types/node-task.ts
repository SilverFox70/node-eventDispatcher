import { createGraph, defineComponent, contract, type TaskContext } from 'event-driven-design';
import { z } from 'zod';
const numeric = contract('task-number@1', z.number());
const node = defineComponent({ id: 'task', version: 1, title: 'Task', description: '', in: { in: numeric }, out: { out: numeric },
  create: () => async ctx => {
    for await (const p of ctx.inputs.in) {
      const value: number = await ctx.task((attempt: TaskContext) => { const id: string = attempt.attemptId; void id; return p.value * attempt.attempt; });
      void value;
      // @ts-expect-error A task handler must be callable.
      ctx.task(2);
      // @ts-expect-error Task signal is readonly.
      await ctx.task(task => { task.signal = new globalThis.AbortController().signal; return 2; });
      const text = await ctx.task(() => 'wrong');
      // @ts-expect-error Task results do not widen the declared output packet contract.
      await ctx.send('out', { ...p, value: text });
      // @ts-expect-error No per-call timeout/retry override is exposed.
      ctx.task(() => 2, { timeoutMs: 5 });
    }
  } });
const graph = createGraph(), n = graph.add('n', node, { taskTimeoutMs: 1000,
  retry: { maxRetries: 2, codes: ['TEMPORARY'], delayMs: 10, idempotent: true } });
graph.exposeInput('in', n, 'in'); graph.exposeOutput('out', n, 'out');
// @ts-expect-error Retry requires an explicit safety acknowledgement.
graph.add('bad', node, { retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: false } });
