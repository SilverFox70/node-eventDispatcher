const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const f = require('../dist/cjs');
const { validateDecisions, validateDecisionCatalog, validateCatalog } = require('../dist/cjs/model');
const { start } = require('./diagnostic-fixture');
const declaration = { code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcomes: ['drop'], facts: ['amount'] };

test('declared decision metadata is frozen, versioned separately and validated without factories', async () => {
  let factories = 0, getters = 0;
  const spec = { id: 'declared', version: 1, title: 'Declared', description: '', in: { in: f.jsonContract }, out: { out: f.jsonContract }, create() { factories++; return async () => {}; } };
  for (const decisions of [undefined, null, {}, Array(33).fill(declaration), [declaration, declaration], [{ ...declaration, extra: 1 }],
    [{ ...declaration, code: '' }], [{ ...declaration, ruleVersion: 'x'.repeat(257) }], [{ ...declaration, outcomes: [] }],
    [{ ...declaration, outcomes: ['drop', 'drop'] }], [{ ...declaration, outcomes: ['other'] }], [{ ...declaration, facts: ['x', 'x'] }],
    [{ ...declaration, facts: Array(17).fill('x') }], [{ ...declaration, facts: [1] }],
    [{ ...declaration, get outcomes() { getters++; return ['drop']; } }]]) assert.throws(() => f.defineComponent({ ...spec, decisions }), { code: 'INVALID_ARGUMENT' });
  const declared = [declaration]; const node = f.defineComponent({ ...spec, decisions: declared }); declared.length = 0;
  const catalog = f.describeDecisions({ 'declared@1': node }); assert.equal(factories, 0); assert.equal(getters, 0);
  assert.deepEqual(validateDecisionCatalog(catalog), { ok: true }); assert(Object.isFrozen(catalog.components[0].decisions[0].facts));
  assert.deepEqual(validateCatalog(f.describeRegistry({ 'declared@1': node })), { ok: true });
  assert(!Object.hasOwn(f.describeRegistry({ 'declared@1': node }).components[0], 'decisions'));
  assert.equal(f.describeDecisions({ 'filter@1': f.filter(f.jsonContract, () => true) }).components[0].decisions.length, 0);
  for (const value of [null, { ...catalog, format: 'other' }, { ...catalog, version: 2 }, { ...catalog, extra: true },
    { ...catalog, components: Array(1025).fill(catalog.components[0]) }, { ...catalog, components: [catalog.components[0], catalog.components[0]] },
    { ...catalog, components: [{ ...catalog.components[0], component: 'bad' }] }, { ...catalog, components: [{ ...catalog.components[0], component: 'x@0' }] }]) assert.equal(validateDecisionCatalog(value).ok, false);
  assert.throws(() => f.describeDecisions({ wrong: node }), { code: 'INVALID_ARGUMENT' });
});

test('browser decision admission rejects unsafe fields and mismatched attribution without evaluating payloads', async () => {
  const node = f.defineFunction({ id: 'why', version: 1, title: 'Why', description: '', input: f.jsonContract, output: f.jsonContract, decisions: [declaration],
    handler(value, ctx) { ctx.recordDecision({ code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcome: 'drop', facts: [{ name: 'amount', sourcePacketId: ctx.packet.packetId, fieldPath: '/a~1b/~0' }] }); return value; } });
  const { run, output } = start(node); await run.send('request', f.packet(4)); await run.finish(); await output;
  const snapshot = f.decisionSnapshot(run), event = snapshot.events[0]; assert.deepEqual(validateDecisions(snapshot), { ok: true });
  const bad = [null, { ...snapshot, format: 'other' }, { ...snapshot, version: 2 }, { ...snapshot, extra: true }, { ...snapshot, rejected: -1 },
    { ...snapshot, total: 2 }, { ...snapshot, events: Array(1025).fill(event) }];
  for (const patch of [{ format: 'unknown' }, { version: 2 }, { runId: randomUUID() }, { sequence: 0 }, { timeMs: -1 }, { nodeId: '' },
    { operationId: 'bad' }, { attemptId: 'bad' }, { attempt: 0 }, { outcome: 'unknown' }, { code: '' }, { error: new Error('PRIVATE') },
    { facts: [{ name: 'amount', sourcePacketId: randomUUID() }] }, { facts: [{ name: 'amount', value: 4 }] },
    { facts: [{ name: 'amount', sourcePacketId: event.inputs[0].packetId, fieldPath: '/~2' }] }]) bad.push({ ...snapshot, events: [{ ...event, ...patch }] });
  for (const value of bad) assert.equal(validateDecisions(value).ok, false);
  assert.throws(() => f.decisionSnapshot({}), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => f.onDecisions(run, null), TypeError);
  let calls = 0; f.onDecisions(run, () => { calls++; throw Error('observer'); });
  assert.equal(calls, 0);
});

test('decision descriptor export accepts the1024 boundary and refuses larger registries before factories', () => {
  let factories = 0; const registry = {};
  for (let i = 0; i < 1025; i++) registry[`node-${i}@1`] = f.defineComponent({ id: `node-${i}`, version: 1, title: 'Node', description: '', in: {}, out: {},
    create() { factories++; return async () => {}; } });
  assert.throws(() => f.describeDecisions(registry), { code: 'INVALID_ARGUMENT' }); delete registry['node-1024@1'];
  const catalog = f.describeDecisions(registry); assert.equal(catalog.components.length, 1024);
  assert.deepEqual(validateDecisionCatalog(catalog), { ok: true }); assert.equal(factories, 0);
});
