const { test } = require('node:test');
const assert = require('node:assert/strict');
const framework = require('../dist/cjs');
const { start } = require('./diagnostic-fixture');
test('a legacy false predicate leaves an observed drop without inventing a reason', async () => {
  const { run, output } = start(framework.filter(framework.jsonContract, () => false));
  const input = framework.packet({ amount: 4 }, { jobId: 'eligible-4' });
  await run.send('request', input); await run.finish(); assert.deepEqual(await output, []);
  assert.equal((await run.done).status, 'completed');
  const snapshot = framework.decisionSnapshot(run);
  const observed = snapshot.events.find(event => event.format === 'nodeflow.filter');
  assert(observed, 'Intentional no-output must retain the observed predicate disposition');
  assert.equal(observed.outcome, 'drop'); assert.equal(observed.inputs[0].packetId, input.packetId);
  assert(!Object.hasOwn(observed, 'code'));
});

const declaration = { code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcomes: ['drop'], facts: ['amount'] };
const request = (packet, extra = {}) => ({ code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcome: 'drop',
  facts: [{ name: 'amount', sourcePacketId: packet.packetId, fieldPath: '/amount' }], ...extra });

test('reported reason and actual predicate disposition preserve packet/job/attempt identity', async () => {
  let calls = 0;
  const predicate = framework.filter(framework.jsonContract, (value, ctx) => {
    calls++; if (value.amount < 5) assert.equal(ctx.recordDecision(request(ctx.packet)), true);
    return value.amount >= 5;
  });
  const node = framework.defineComponent({ ...predicate, decisions: [declaration] });
  const { run, output } = start(node), input = framework.packet({ amount: 4 }, { jobId: 'amount-4' }), keep = framework.packet({ amount: 6 });
  let notices = 0; const off = framework.onDecisions(run, () => notices++);
  await run.send('request', input); await run.send('request', keep); await run.finish();
  assert.deepEqual((await output).map(p => p.packetId), [keep.packetId]); assert.equal(calls, 2); off(); off(); assert(notices > 0);
  const snapshot = framework.decisionSnapshot(run), reports = snapshot.events.filter(e => e.format === 'nodeflow.decision');
  assert.equal(reports.length, 1); assert.equal(reports[0].code, 'BELOW_THRESHOLD'); assert.equal(reports[0].ruleVersion, 'rule-v1');
  assert.equal(reports[0].inputs[0].packetId, input.packetId); assert.equal(reports[0].inputs[0].jobId, 'amount-4');
  assert.equal(reports[0].facts[0].fieldPath, '/amount'); assert(!JSON.stringify(reports).includes('"value"'));
  const attempt = run.diagnostics().events.find(e => e.kind === 'attempt-started' && e.attemptId === reports[0].attemptId);
  assert.equal(attempt.operationId, reports[0].operationId); assert.equal(attempt.nodeId, reports[0].nodeId);
  assert.deepEqual(snapshot.events.filter(e => e.format === 'nodeflow.filter').map(e => e.outcome), ['drop', 'keep']);
  assert(Object.isFrozen(snapshot.events[0].facts));
  assert.deepEqual(require('../dist/cjs/model').validateDecisions(JSON.parse(JSON.stringify(snapshot))), { ok: true });
  assert.deepEqual(require('../dist/cjs/model').validateDiagnostics(run.diagnostics()), { ok: true });
});

test('a reported drop cannot override an observed keep or grant capture permission', async () => {
  const node = framework.defineComponent({ ...framework.filter(framework.jsonContract, (value, ctx) => {
    ctx.recordDecision(request(ctx.packet)); return true;
  }), decisions: [declaration] });
  const { run, output } = start(node); await run.send('request', framework.packet({ amount: 4, secret: 'PRIVATE' })); await run.finish();
  assert.equal((await output).length, 1);
  assert.deepEqual(framework.decisionSnapshot(run).events.map(e => e.outcome), ['drop', 'keep']);
  assert(!JSON.stringify(framework.decisionSnapshot(run)).includes('PRIVATE'));
});

test('malformed, undeclared, foreign and over-budget reports never change handler result', async () => {
  let getters = 0, saved, accepted = 0;
  const node = framework.defineFunction({ id: 'reason', version: 1, title: 'Reason', description: '', input: framework.jsonContract, output: framework.jsonContract,
    decisions: [declaration], handler(value, ctx) {
      saved = ctx;
      const valid = request(ctx.packet);
      const invalid = [null, new Error('PRIVATE'), { ...valid, extra: true }, { ...valid, code: 'UNKNOWN' }, { ...valid, ruleVersion: 'other' },
        { ...valid, outcome: 'keep' }, { ...valid, facts: [{ name: 'other' }] }, { ...valid, facts: [{ name: 'amount', sourcePacketId: framework.packet(1).packetId }] },
        { ...valid, facts: [{ name: 'amount', fieldPath: '/amount' }] }, { ...valid, facts: [{ name: 'amount', sourcePacketId: ctx.packet.packetId, fieldPath: '/~bad' }] },
        { ...valid, facts: [valid.facts[0], valid.facts[0]] }, { ...valid, facts: Array(17).fill(valid.facts[0]) },
        { ...valid, get facts() { getters++; return []; } }, new Proxy(valid, { getPrototypeOf() { getters++; return Object.prototype; } })];
      for (const item of invalid) assert.equal(ctx.recordDecision(item), false);
      for (let i = 0; i < 34; i++) if (ctx.recordDecision(valid)) accepted++;
      return value;
    } });
  const { run, output } = start(node); await run.send('request', framework.packet(4)); await run.finish(); assert.equal((await output)[0].value, 4);
  assert.equal(accepted, 32); assert.equal(getters, 0); assert.equal(saved.recordDecision(request(saved.packet)), false);
  const snapshot = framework.decisionSnapshot(run); assert.equal(snapshot.total, 32); assert.equal(snapshot.rejected, 17);
});

test('aggregate retention evicts observations without weakening execution protection', async () => {
  const node = framework.defineComponent({ ...framework.filter(framework.jsonContract, (value, ctx) => { ctx.recordDecision(request(ctx.packet)); return true; }), decisions: [declaration] });
  const { run, output } = start(node, { diagnostics: { limit: 4 } }); const input = framework.packet(4);
  await run.send('request', input); await assert.rejects(run.send('request', input), { code: 'DUPLICATE_PACKET' });
  await run.finish(); assert.equal((await output).length, 1);
  const metadata = run.diagnostics(), decisions = framework.decisionSnapshot(run);
  assert(metadata.events.length + decisions.events.length <= 4); assert(decisions.dropped > 0);
  assert.deepEqual(require('../dist/cjs/model').validateDecisions(decisions), { ok: true });
});
