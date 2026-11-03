const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet, FlowError } = require('../dist/cjs');
const { start, fn, processNode, deferred } = require('./diagnostic-fixture');

test('explicit binding refuses forged, duplicate, mixed-job, other-node and other-run inputs before work', async () => {
  let invocations = 0;
  const { run, output } = start(processNode(() => async ctx => {
    const seen = []; for await (const p of ctx.inputs.in) seen.push(p);
    for (const options of [null, {}, { inputs: [] }, { extra: 1, inputs: [seen[0]] }, { inputs: [packet(1)] },
      { inputs: [{ ...seen[0] }] }, { inputs: [seen[0], seen[0]] }, { inputs: seen }, { inputs: Array(257).fill(seen[0]) }]) {
      await assert.rejects(ctx.task(() => { invocations++; }, options), { code: 'INVALID_ARGUMENT' });
    }
    let accessed = 0;
    await assert.rejects(ctx.task(() => { invocations++; }, { get inputs() { accessed++; return [seen[0]]; } }), { code: 'INVALID_ARGUMENT' });
    assert.equal(accessed, 0);
    await ctx.task(() => { invocations++; }, { inputs: [seen[0]] });
  }));
  await run.send('request', packet(1, { jobId: 'A' })); await run.send('request', packet(2, { jobId: 'B' }));
  run.closeInput('request'); assert.equal((await run.done).status, 'completed'); await output;
  assert.equal(invocations, 1); assert.equal(run.diagnostics().events.filter(e => e.kind === 'operation-started').length, 1);
  let old;
  const node = processNode(() => async ctx => {
    for await (const p of ctx.inputs.in) {
      if (old) await assert.rejects(ctx.task(() => { invocations++; }, { inputs: [old] }), { code: 'INVALID_ARGUMENT' });
      old = p;
    }
  });
  for (let i = 0; i < 2; i++) {
    const next = start(node); await next.run.send('request', packet(i)); next.run.closeInput('request'); await next.run.done; await next.output;
  }
  assert.equal(invocations, 1);
  const { createGraph, compileGraph, startNetwork } = require('../dist/cjs');
  let upstream;
  const first = processNode(() => async ctx => { for await (const p of ctx.inputs.in) { upstream = p; await ctx.send('out', p); } }, 'source');
  const second = processNode(() => async ctx => { for await (const p of ctx.inputs.in) {
    await assert.rejects(ctx.task(() => {}, { inputs: [upstream] }), { code: 'INVALID_ARGUMENT' }); await ctx.send('out', p);
  } }, 'sink');
  const builder = createGraph(), a = builder.add('a', first), b = builder.add('b', second);
  builder.connect(a, 'out', b, 'in'); builder.exposeInput('request', a, 'in'); builder.exposeOutput('result', b, 'out');
  const compiled = compileGraph(builder.toSpec(), { 'source@1': first, 'sink@1': second }); assert(compiled.ok);
  const network = startNetwork(compiled.graph); const read = (async () => { for await (const p of network.outputs.result) assert(p); })();
  await network.send('request', packet(3)); network.closeInput('request'); await network.done; await read;
});

test('multiparent task binds supplied same-job inputs including the 256-input boundary', async () => {
  for (const count of [2, 256]) {
    const { run, output } = start(processNode(() => async ctx => {
      const inputs = []; for await (const p of ctx.inputs.in) inputs.push(p);
      await ctx.task(() => 1, { inputs });
    }), { diagnostics: { limit: 1024 } });
    const parents = Array.from({ length: count }, (_, i) => packet(i, { jobId: 'same' }));
    for (const p of parents) await run.send('request', p);
    run.closeInput('request'); await run.done; await output;
    const startEvent = run.diagnostics().events.find(e => e.kind === 'attempt-started');
    assert.deepEqual(startEvent.inputs.map(p => p.packetId), parents.map(p => p.packetId));
    assert(startEvent.inputs.every(p => !Object.hasOwn(p, 'value'))); assert(Object.isFrozen(startEvent.inputs));
  }
});

test('retry observes one operation and distinct attempts without disclosing arbitrary retry codes', async () => {
  let calls = 0;
  const { run, output } = start(fn(x => { if (++calls === 1) throw new FlowError('PRIVATE_RETRY_CODE'); return x; }), {},
    { retry: { maxRetries: 1, codes: ['PRIVATE_RETRY_CODE'], delayMs: 0, idempotent: true } });
  await run.send('request', packet(1)); run.closeInput('request'); await run.done; await output;
  const events = run.diagnostics().events, starts = events.filter(e => e.kind === 'attempt-started');
  assert.equal(calls, 2); assert.equal(starts.length, 2); assert.deepEqual(starts.map(e => e.attempt), [1, 2]);
  assert.equal(starts[0].operationId, starts[1].operationId); assert.notEqual(starts[0].attemptId, starts[1].attemptId);
  assert.equal(events.filter(e => e.kind === 'operation-finished').length, 1);
  assert(!JSON.stringify(events).includes('PRIVATE_RETRY_CODE'));
});

test('local timeout remains timed-out despite later successful settlement', async () => {
  const release = deferred();
  const { run, output } = start(fn(async () => { await release.promise; return 1; }), {}, { taskTimeoutMs: 10 });
  await run.send('request', packet(1)); run.closeInput('request'); await run.done; await output;
  const before = run.diagnostics(), finish = before.events.find(e => e.kind === 'attempt-finished');
  assert.equal(finish.outcome, 'timed-out'); assert.equal(finish.code, 'NODE_TIMEOUT');
  release.resolve(); await require('node:timers/promises').setImmediate(); assert.deepEqual(run.diagnostics(), before);
});
