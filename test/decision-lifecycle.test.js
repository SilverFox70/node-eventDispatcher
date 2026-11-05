const { test } = require('node:test');
const assert = require('node:assert/strict');
const f = require('../dist/cjs');
const { start, deferred } = require('./diagnostic-fixture');
const { flush, clock } = require('./node-task-fixture.cjs');
const declaration = { code: 'REASON', ruleVersion: 'v1', outcomes: ['business-result'], facts: ['input'] };
const report = context => ({ code: 'REASON', ruleVersion: 'v1', outcome: 'business-result', facts: [{ name: 'input', sourcePacketId: context.packet.packetId }] });
const fn = handler => f.defineFunction({ id: 'lifecycle-reason', version: 1, title: 'Reason', description: '', input: f.jsonContract, output: f.jsonContract, decisions: [declaration], handler });

test('retries bind distinct reports; a foreign async attempt cannot use the live context', async () => {
  const ready = deferred(), checked = deferred(); let current, old, foreign;
  const node = fn(async (value, context) => {
    if (context.attempt === 1) {
      old = context; assert(context.recordDecision(report(context)));
      void (async () => { await ready.promise; foreign = current.recordDecision(report(current)); checked.resolve(); })();
      throw new f.FlowError('TEMPORARY');
    }
    current = context; ready.resolve(); await checked.promise;
    assert.equal(old.recordDecision(report(old)), false); assert(context.recordDecision(report(context))); return value;
  });
  const { run, output } = start(node, {}, { retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } });
  await run.send('request', f.packet(4, { jobId: 'retry-job' })); await run.finish(); assert.equal((await output)[0].value, 4);
  assert.equal(foreign, false);
  const snapshot = f.decisionSnapshot(run); assert.equal(snapshot.rejected, 2); assert.deepEqual(snapshot.events.map(e => e.attempt), [1, 2]);
  assert.equal(new Set(snapshot.events.map(e => e.operationId)).size, 1); assert.equal(new Set(snapshot.events.map(e => e.attemptId)).size, 2);
  assert(snapshot.events.every(e => e.inputs[0].jobId === 'retry-job'));
});

test('late timed-out handler cannot publish decisions or output after observed termination', async t => {
  const time = clock(t), entered = deferred(), release = deferred(); let accepted;
  const node = fn(async (value, context) => {
    context.recordDecision(report(context)); entered.resolve(); await release.promise;
    accepted = context.recordDecision(report(context)); return value;
  });
  const { run, output } = start(node, {}, { taskTimeoutMs: 5 });
  await run.send('request', f.packet(4)); await entered.promise; time.fire(5);
  assert.equal((await run.done).status, 'failed'); const before = run.diagnostics();
  release.resolve(); await flush(); assert.deepEqual(await output, []); assert.equal(accepted, false);
  assert.equal(f.decisionSnapshot(run).events.length, 1); assert.equal(f.decisionSnapshot(run).rejected, 1);
  assert.deepEqual(run.diagnostics(), before); assert.equal(time.timers.size, 0);
});

test('recorder/storage and observer exceptions cannot change the business result', async t => {
  const node = fn((value, context) => { assert.equal(context.recordDecision(report(context)), false); return value; });
  const freeze = Object.freeze;
  t.mock.method(Object, 'freeze', object => {
    if (object?.format === 'nodeflow.decision') throw Error('RECORDER_UNAVAILABLE');
    return freeze(object);
  });
  const { run, output } = start(node); let notices = 0;
  f.onDecisions(run, () => { notices++; throw Error('OBSERVER_UNAVAILABLE'); });
  await run.send('request', f.packet(4)); await run.finish(); assert.equal((await output)[0].value, 4);
  assert.equal((await run.done).status, 'completed'); assert.equal(f.decisionSnapshot(run).rejected, 1);
  assert.equal(f.decisionSnapshot(run).total, 0); assert.equal(notices, 1);
});

test('node-scoped reports may name a fact without pretending it references a packet', async () => {
  const node = f.defineComponent({ id: 'scope-reason', version: 1, title: 'Reason', description: '', in: {}, out: { out: f.jsonContract }, decisions: [declaration],
    create: () => async ctx => { const value = await ctx.task(context => { assert(context.recordDecision({ code: 'REASON', ruleVersion: 'v1', outcome: 'business-result', facts: [{ name: 'input' }] })); return 4; }); await ctx.send('out', f.packet(value)); } });
  const g = f.createGraph(), h = g.add('node', node); g.exposeOutput('result', h, 'out'); const c = f.compileGraph(g.toSpec(), { 'scope-reason@1': node }); assert(c.ok);
  const run = f.startNetwork(c.graph), results = (async () => { for await (const p of run.outputs.result) assert.equal(p.value, 4); })();
  await run.done; await results; assert.deepEqual(f.decisionSnapshot(run).events[0].inputs, []);
  const { getDecisionStream } = require('../dist/cjs/runtime/diagnostics/records');
  assert.throws(() => getDecisionStream(() => {}), { code: 'INVALID_ARGUMENT' });
});

test('failed observed-filter recording cannot turn a keep into a failed operation', async t => {
  const freeze = Object.freeze;
  t.mock.method(Object, 'freeze', object => {
    if (object?.format === 'nodeflow.filter') throw Error('RECORDER_UNAVAILABLE');
    return freeze(object);
  });
  const { run, output } = start(f.filter(f.jsonContract, () => true));
  await run.send('request', f.packet(4)); await run.finish();
  assert.equal((await output)[0].value, 4); assert.equal((await run.done).status, 'completed');
  assert.equal(f.decisionSnapshot(run).rejected, 1); assert.equal(f.decisionSnapshot(run).total, 0);
});
