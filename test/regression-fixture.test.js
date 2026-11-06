const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');
const core = require('../dist/cjs');
const testing = require('../dist/cjs/testing');
const { z } = require('zod');

const identity = 'a'.repeat(64);
function makeGraph(f, schema, lookup, delta = 0, acceptedReport = true) {
  const input = f.contract('fixture-name@1', schema.string());
  const output = f.contract('fixture-result@1', schema.strictObject({ label: schema.string(), amount: schema.number() }));
  const node = f.defineFunction({ id: 'lookup', version: 1, title: 'Lookup', description: '',
    input, output, decisions: [{ code: 'LOOKUP', ruleVersion: 'v1', outcomes: ['business-result'], facts: [] }],
    handler: (label, context) => {
      context.recordDecision({ code: acceptedReport ? 'LOOKUP' : 'UNDECLARED', ruleVersion: 'v1', outcome: 'business-result', facts: [] });
      return { label, amount: lookup() + delta };
    } });
  const graph = f.createGraph(), handle = graph.add('lookup', node);
  graph.exposeInput('request', handle, 'in'); graph.exposeOutput('result', handle, 'out');
  const compiled = f.compileGraph(graph.toSpec(), { 'lookup@1': node });
  if (!compiled.ok) throw Error('Fixture graph did not compile');
  return compiled.graph;
}

async function recorded() {
  const graph = makeGraph(core, z, () => 7);
  const run = core.startNetwork(graph, { capturePolicy: {
    allowedNodes: ['lookup'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 128, maxSessionMs: 1000,
  } });
  run.openDiagnosticsSession({ rules: [{ nodeId: 'lookup', inputs: true, outputs: true }], expiresInMs: 1000 });
  const reading = (async () => { for await (const row of run.outputs.result) assert.equal(row.value.amount, 7); })();
  await run.send('request', core.packet('Private Person', { jobId: 'recorded-job', key: 'group' }));
  await run.finish(); await reading;
  const diagnostics = run.diagnostics();
  const evidence = { format: 'nodeflow.evidence', version: 1, runId: run.runId, diagnostics,
    decisions: core.decisionSnapshot(run), identity: { status: 'verified', digest: identity } };
  const input = diagnostics.events.find(row => row.kind === 'input-admitted');
  const output = diagnostics.events.find(row => row.kind === 'sent');
  assert.equal(input.capture.value, 'Private Person');
  assert.equal(output.capture.value.label, 'Private Person');
  const fixture = { format: 'nodeflow.fixture', version: 1, caseId: 'sample-case', executionIdentity: identity,
    input: { request: [{ value: 'Sample', key: 'group' }] },
    dependencyScripts: { lookup: [{ outcome: 'result', value: 7 }] },
    expected: { outputs: { result: [{ value: { label: 'Sample', amount: 7 }, key: 'group' }] },
      decisions: [{ nodeId: 'lookup', code: 'LOOKUP', ruleVersion: 'v1', outcome: 'business-result' }] },
    redactionReview: { reviewId: 'approved-sample', substitutions: ['/input/request/0/value', '/expected/outputs/result/0/value/label'] },
    provenance: { runId: run.runId, inputSequences: [input.sequence], outputSequences: [output.sequence] } };
  return { evidence, graph, fixture };
}

function approve(fixture) {
  return fixture.redactionReview.reviewId === 'approved-sample' &&
    fixture.input.request[0].value === 'Sample' && fixture.expected.outputs.result[0].value.label === 'Sample' &&
    Object.keys(fixture.dependencyScripts).join() === 'lookup';
}
const prepare = (graph, evidence, fixture, review = approve) =>
  testing.prepareRegressionFixture(graph, evidence, 'recorded-job', fixture, { roles: ['lookup'], approve: review });
const bindings = (delta = 0) => ({ executionIdentity: identity, roles: ['lookup'], approve,
  build: services => makeGraph(core, z, services.lookup, delta) });

test('reviewed replacements satisfy production contracts and reproduce value and decision evidence', async () => {
  const { graph, evidence, fixture } = await recorded();
  const approved = prepare(graph, evidence, fixture);
  assert(Object.isFrozen(approved.input.request[0]));
  await testing.runRegressionFixture(approved, bindings());
  await assert.rejects(testing.runRegressionFixture(approved, bindings(1)), /Fixture outputs changed/);
  await assert.rejects(testing.runRegressionFixture({ ...approved, expected: { ...approved.expected, decisions: [] } }, bindings()), /Fixture decisions changed/);
});

test('invalid data, missing capture and untrusted bindings refuse before creating files or starting the graph', async () => {
  const { graph, evidence, fixture } = await recorded();
  const output = await mkdtemp(join(tmpdir(), 'fbp-fixture-'));
  try {
    for (const value of [
      { ...fixture, redactionReview: { reviewId: 'approved-sample', substitutions: ['/input/missing'] } },
      { ...fixture, redactionReview: { reviewId: 'approved-sample', substitutions: ['not-a-pointer'] } },
      { ...fixture, version: 2 }, { ...fixture, caseId: '../outside' }, { ...fixture, source: 'eval()' },
      { ...fixture, input: { request: [{ value: '{{name}}' }] } },
      { ...fixture, input: { request: [{ value: { apiKey: 'dummy' } }] } },
      { ...fixture, input: { request: [{ value: 'Bearer 1234567890abcdef' }] } },
      { ...fixture, dependencyScripts: { lookup: [{ outcome: 'launch', code: 'NO' }] } },
      { ...fixture, dependencyScripts: { lookup: [{ outcome: 'result', value: 'x'.repeat(262145) }] } },
    ]) {
      assert.equal(testing.validateRegressionFixture(value).ok, false);
      assert.throws(() => prepare(graph, evidence, value), { code: 'INVALID_FIXTURE' });
    }
    assert.throws(() => prepare(graph, evidence, { ...fixture, redactionReview: { ...fixture.redactionReview, substitutions: [] } }), { code: 'FIXTURE_REVIEW_REQUIRED' });
    assert.throws(() => prepare(graph, evidence, fixture, () => false), { code: 'FIXTURE_REVIEW_REQUIRED' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, executionIdentity: 'b'.repeat(64) }), { code: 'BINDING_MISMATCH' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, input: { request: [], extra: [{ value: 'Sample' }] },
      redactionReview: { ...fixture.redactionReview, substitutions: [] } }), { code: 'BINDING_MISMATCH' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, input: { wrong: [{ value: 'Sample' }] },
      redactionReview: { ...fixture.redactionReview, substitutions: [] } }), { code: 'BINDING_MISMATCH' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, expected: { ...fixture.expected,
      decisions: [{ ...fixture.expected.decisions[0], nodeId: 'missing' }] } }), { code: 'BINDING_MISMATCH' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, input: { request: [{ value: 1 }] } }), { code: 'FIXTURE_CONTRACT' });
    assert.throws(() => prepare(graph, { ...evidence, identity: { status: 'unverified' } }, fixture), { code: 'FIXTURE_INCOMPLETE' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, provenance: { ...fixture.provenance, inputSequences: [999] } }), { code: 'FIXTURE_INCOMPLETE' });
    for (const mode of ['missing', 'truncated']) {
      const events = evidence.diagnostics.events.map(row => {
        if (row.kind !== 'input-admitted') return row;
        const { capture, captureEpoch, captureSessionId, ...base } = row;
        if (mode === 'missing') return base;
        return { ...base, captureEpoch, captureSessionId, capture: { state: 'truncated', preview: 'Priv', bytes: capture.bytes } };
      });
      assert.throws(() => prepare(graph, { ...evidence, diagnostics: { ...evidence.diagnostics, events } }, fixture), { code: 'FIXTURE_INCOMPLETE' });
    }
    assert.throws(() => prepare(graph, evidence, { ...fixture, dependencyScripts: { foreign: [] } }), { code: 'BINDING_MISMATCH' });
    assert.throws(() => prepare(graph, evidence, { ...fixture,
      get input() { throw Error('accessor executed'); } }), { code: 'INVALID_FIXTURE' });
    assert.throws(() => prepare(graph, evidence, { ...fixture, input: { request: [{ value: 'Sample' }, { value: 'Extra' }] },
      provenance: { ...fixture.provenance, inputSequences: [...fixture.provenance.inputSequences, 999] } }), { code: 'FIXTURE_INCOMPLETE' });
    let builds = 0;
    await assert.rejects(testing.runRegressionFixture(fixture, { ...bindings(), roles: ['foreign'], build() { builds++; } }), { code: 'BINDING_MISMATCH' });
    assert.equal(builds, 0);
    await assert.rejects(testing.writeRegressionTest(output, fixture), { code: 'FIXTURE_REVIEW_REQUIRED' });
    const approved = prepare(graph, evidence, fixture);
    const path = join(output, 'sample-case.test.mjs');
    await writeFile(path, 'handwritten');
    await assert.rejects(testing.writeRegressionTest(output, approved), { code: 'EEXIST' });
    assert.equal(await readFile(path, 'utf8'), 'handwritten');
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('generated test runs in the isolated installed package with network permission denied', async () => {
  const { graph, evidence, fixture } = await recorded();
  const c = installedPackage();
  try {
    const path = await testing.writeRegressionTest(c.fixture, prepare(graph, evidence, fixture));
    assert(!(await readFile(path, 'utf8')).includes('Private Person'));
    const module = `import * as f from 'event-driven-design'; import { z } from 'zod';
${makeGraph.toString()}
${approve.toString()}
export const fixtureBindings = { executionIdentity: '${identity}', roles: ['lookup'], approve,
  build: services => makeGraph(f, z, services.lookup, Number(process.env.FIXTURE_DELTA || 0)) };
`;
    const online = c.attempt(process.execPath, ['--test', '--test-isolation=none', path]);
    assert.equal(online.status, 1); assert.match(online.stdout, /network permission disabled/);
    await writeFile(join(c.fixture, 'fixture-bindings.mjs'), module);
    const args = ['--permission', '--allow-fs-read=*', '--test', '--test-isolation=none', path];
    assert.match(c.run(process.execPath, args), /pass 1/);
    await writeFile(join(c.fixture, 'fixture-bindings.mjs'), module.replace('Number(process.env.FIXTURE_DELTA || 0)', '1'));
    const result = c.attempt(process.execPath, args);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Fixture outputs changed/);
  } finally { c.dispose(); }
});

test('offline bindings enforce exact roles, ordered calls and trustworthy decision observations', async () => {
  const { fixture } = await recorded();
  const script = (steps) => ({ ...fixture, dependencyScripts: { lookup: steps } });
  const step = { outcome: 'result', value: 7 };
  await assert.rejects(testing.runRegressionFixture(fixture, { ...bindings(), executionIdentity: 'b'.repeat(64) }), { code: 'BINDING_MISMATCH' });
  await assert.rejects(testing.runRegressionFixture(script([step, step]), bindings()), { code: 'FIXTURE_SCRIPT_MISMATCH' });
  await assert.rejects(testing.runRegressionFixture(script([]), bindings()), { code: 'FIXTURE_RUN_FAILED' });
  const recovered = { ...bindings(), build: ({ lookup }) => makeGraph(core, z, () => {
    assert.throws(lookup, { code: 'MISSING' }); return lookup();
  }) };
  await testing.runRegressionFixture(script([{ outcome: 'error', code: 'MISSING' }, step]), recovered);
  const rejected = { ...bindings(), build: ({ lookup }) => makeGraph(core, z, lookup, 0, false) };
  await assert.rejects(testing.runRegressionFixture(fixture, rejected), { code: 'FIXTURE_INCOMPLETE' });
  const filter = core.filter(core.jsonContract, () => true);
  const graph = core.createGraph(), node = graph.add('filter', filter);
  graph.exposeInput('request', node, 'in'); graph.exposeOutput('result', node, 'out');
  const compiled = core.compileGraph(graph.toSpec(), { 'filter@1': filter });
  assert(compiled.ok);
  const forwarded = { ...fixture, input: { request: [{ value: 'Sample' }] }, dependencyScripts: {},
    expected: { outputs: { result: [{ value: 'Sample' }] }, decisions: [] }, redactionReview: { reviewId: 'fixture', substitutions: [] } };
  await testing.runRegressionFixture(forwarded, { executionIdentity: identity, roles: [], approve: () => true, build: () => compiled.graph });
});

test('substitution comparison honors explicit JSON Pointer escapes and rejects undeclared shape changes', () => {
  const { matchesReviewed, pointerPart } = require('../dist/cjs/diagnostics/fixture-export/substitutions');
  assert.equal(pointerPart('a/~b'), 'a~1~0b');
  assert(matchesReviewed({ 'a/~b': [1] }, { 'a/~b': [2] }, '', new Set(['/a~1~0b/0'])));
  assert(!matchesReviewed({ field: {} }, { field: [] }, '', new Set()));
  assert(!matchesReviewed({ field: null }, { field: {} }, '', new Set()));
  assert(!matchesReviewed({ field: {} }, { field: null }, '', new Set()));
  assert(!matchesReviewed({}, JSON.parse('{"__proto__":{}}'), '', new Set()));
  assert(!matchesReviewed({ field: 1 }, {}, '', new Set()));
});
