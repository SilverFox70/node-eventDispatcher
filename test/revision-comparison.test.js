const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');
const core = require('../dist/cjs');
const { compareFixture } = require('../dist/cjs/testing');
const { z } = require('zod');

function comparisonCase(core, z, runId) {
  const zero = '0'.repeat(64);
  const amount = core.contract('amount@1', z.number());
  const split = core.broadcast(amount, ['tax', 'base']);
  const base = core.defineFunction({ id: 'base', title: 'Base amount', version: 1, description: '',
    input: amount, output: amount, handler: value => value });
  function side(version, rate, options = {}) {
    const taxNode = options.rename ?? 'tax';
    function definition(lookup) {
      const tax = core.defineFunction({ id: 'tax', title: 'Tax', version: 1, description: '',
        input: amount, output: options.stringOutput ? core.contract('text@1', z.string()) : amount,
        decisions: [{ code: 'TAX', ruleVersion: version, outcomes: ['business-result'], facts: ['amount', 'policy'] }],
        handler: (value, context) => {
          if (!options.skipService) lookup();
          if (options.failure) throw new core.FlowError('COMPONENT_FAILED');
          context.recordDecision({ code: options.rejected ? 'MISSING' : 'TAX', ruleVersion: version, outcome: 'business-result', facts: [
            { name: 'amount', sourcePacketId: context.packet.packetId, fieldPath: '' }, { name: 'policy' },
          ] });
          return Number(value) * rate;
        } });
      const builder = core.createGraph();
      const source = builder.add('split', split), left = builder.add(taxNode, tax), right = builder.add('base', base);
      builder.exposeInput('amount', source, 'in');
      builder.connect(source, 'tax', left, 'in'); builder.connect(source, 'base', right, 'in');
      builder.exposeOutput('base', right, 'out');
      const registry = { 'broadcast@1': split, 'tax@1': tax, 'base@1': base };
      if (options.filter) {
        const filter = core.filter(amount, () => true), gate = builder.add('keep', filter);
        registry['filter@1'] = filter;
        builder.connect(left, 'out', gate, 'in'); builder.exposeOutput('tax', gate, 'out');
      } else builder.exposeOutput('tax', left, 'out');
      return { graph: builder.toSpec(), registry };
    }
    const { graph } = definition(() => { throw Error('specimen construction called a dependency'); });
    return { deterministic: true, roles: ['rates'], approve: value => value.redactionReview.reviewId === 'reviewed',
      ...(options.rename ? { origins: { [taxNode]: 'tax' } } : {}),
      revision: { graph, runtimeVersion: 'runtime-v1', policyVersion: 'policy-v1', serviceProfileDigest: zero,
        bindings: graph.nodes.map(node => ({ component: node.component,
          implementationDigest: node.id === taxNode ? version.at(-1).repeat(64) : zero, contractsDigest: zero })) },
      build(services) {
        const { graph, registry } = definition(services.rates);
        const compiled = core.compileGraph(graph, registry);
        if (!compiled.ok) throw Error('Invalid test graph');
        return compiled.graph;
      } };
  }
  const baseline = side('v1', 0.10), candidate = side('v2', 0.20);
  const fixture = { format: 'nodeflow.fixture', version: 1, caseId: 'tax-case',
    executionIdentity: core.executionIdentity(baseline.revision).digest,
    input: { amount: [{ value: 100 }] }, dependencyScripts: { rates: [{ outcome: 'result', value: true }] },
    expected: { outputs: { tax: [{ value: 10 }], base: [{ value: 100 }] },
      decisions: [{ nodeId: 'tax', code: 'TAX', ruleVersion: 'v1', outcome: 'business-result' }] },
    redactionReview: { reviewId: 'reviewed', substitutions: [] },
    provenance: { runId, inputSequences: [1], outputSequences: [10, 11] } };
  return { fixture, baseline: { ...baseline, fixture }, candidate: { ...candidate, fixture },
    side: (...args) => ({ ...side(...args), fixture }) };
}

test('same fixed case shows changed tax output and rule, with unchanged sibling and no runtime UUID differences', async () => {
  const { baseline, candidate, side } = comparisonCase(core, z, randomUUID());
  const result = await compareFixture({ baseline, candidate });
  assert.equal(result.status, 'changed-on-fixtures');
  assert.equal(result.caseId, 'tax-case');
  assert.notEqual(result.baseline.code, result.candidate.code);
  assert.equal(result.baseline.graph, result.candidate.graph);
  const output = result.changes.find(row => row.kind === 'output' && row.origin[0] === 'tax');
  assert.equal(output.baseline.value, 10); assert.equal(output.candidate.value, 20);
  const decision = result.changes.find(row => row.kind === 'decision');
  assert.equal(decision.baseline.ruleVersion, 'v1'); assert.equal(decision.candidate.ruleVersion, 'v2');
  assert.deepEqual(decision.candidate.facts, [{ name: 'amount', path: '', source: [['sent', 'split', 'tax'], 0] }, { name: 'policy', path: null, source: null }]);
  assert(result.unchanged.some(row => row.kind === 'output' && row.origin[0] === 'base' && row.candidate.value === 100));
  assert(result.unchanged.some(row => row.kind === 'path' && row.origin.includes('tax')));
  const equal = await compareFixture({ baseline, candidate: baseline });
  assert.equal(equal.status, 'equal-on-fixtures'); assert.deepEqual(equal.changes, []);
  const renamed = await compareFixture({ baseline, candidate: side('v1', 0.10, { rename: 'new-tax' }) });
  assert.equal(renamed.status, 'equal-on-fixtures');
  assert.notEqual(renamed.baseline.graph, renamed.candidate.graph);
  const filtered = await compareFixture({ baseline, candidate: side('v1', 0.10, { filter: true }) });
  assert.equal(filtered.status, 'changed-on-fixtures');
  assert(filtered.changes.some(row => row.kind === 'decision' && row.candidate?.format === 'nodeflow.filter'));
  const unaligned = await compareFixture({ baseline, candidate: { ...side('v1', 0.10, { rename: 'new-tax' }), origins: {} } });
  assert.equal(unaligned.status, 'changed-on-fixtures');
  assert(unaligned.changes.some(row => row.kind === 'path' && row.origin.includes('new-tax') && !Object.hasOwn(row, 'baseline')));
  assert(unaligned.changes.some(row => row.kind === 'path' && row.origin.includes('tax') && !Object.hasOwn(row, 'candidate')));
});

test('mismatched facts, unavailable provenance and unknown roles stop before graph building', async () => {
  const { fixture, baseline, candidate } = comparisonCase(core, z, randomUUID());
  let builds = 0;
  const build = () => { builds++; throw Error('Unexpected graph build'); };
  for (const [patch, reason] of [
    [{ fixture: { ...fixture, input: { amount: [{ value: 101 }] } } }, 'FIXTURE_MISMATCH'],
    [{ fixture: { ...fixture, dependencyScripts: { rates: [{ outcome: 'result', value: false }] } } }, 'FIXTURE_MISMATCH'],
    [{ roles: [] }, 'BINDING_MISMATCH'],
    [{ approve: () => false }, 'FIXTURE_REFUSED'],
    [{ deterministic: false }, 'REVISION_UNVERIFIED'],
    [{ revision: { ...candidate.revision, bindings: [] } }, 'REVISION_UNVERIFIED'],
    [{ revision: { ...candidate.revision, serviceProfileDigest: 'f'.repeat(64) } }, 'FIXTURE_MISMATCH'],
    [{ origins: { tax: 'base' } }, 'BINDING_MISMATCH'],
    [{ origins: { unknown: 'base' } }, 'BINDING_MISMATCH'],
  ]) {
    assert.deepEqual(await compareFixture({ baseline: { ...baseline, build }, candidate: { ...candidate, ...patch, build } }),
      { status: 'not-comparable', reason });
  }
  assert.equal(builds, 0);
  const negative = { ...fixture, input: { amount: [{ value: -0 }] } };
  const positive = { ...fixture, input: { amount: [{ value: 0 }] } };
  assert.deepEqual(await compareFixture({ baseline: { ...baseline, fixture: negative, build },
    candidate: { ...candidate, fixture: positive, build } }), { status: 'not-comparable', reason: 'FIXTURE_MISMATCH' });
  const mismatched = { ...fixture, executionIdentity: 'e'.repeat(64) };
  assert.deepEqual(await compareFixture({ baseline: { ...baseline, fixture: mismatched, build }, candidate: { ...candidate, fixture: mismatched, build } }),
    { status: 'not-comparable', reason: 'BINDING_MISMATCH' });
  assert.equal(builds, 0);
});

test('contract refusal and missing evidence are distinct from an observed failure', async () => {
  const { baseline, candidate, side } = comparisonCase(core, z, randomUUID());
  const incompatible = await compareFixture({ baseline, candidate: side('v2', 0.20, { stringOutput: true }) });
  assert.deepEqual(incompatible, { status: 'not-comparable', reason: 'INCOMPATIBLE_CONTRACT' });
  const mismatch = await compareFixture({ baseline, candidate: { ...candidate, build: side('v2', 0.20, { rename: 'different' }).build } });
  assert.deepEqual(mismatch, { status: 'not-comparable', reason: 'BINDING_MISMATCH' });
  const failed = await compareFixture({ baseline, candidate: side('v2', 0.20, { failure: true }) });
  assert.equal(failed.status, 'changed-on-fixtures');
  assert(failed.changes.some(row => row.kind === 'failure' && row.candidate.code === 'COMPONENT_FAILED'));
  const unused = await compareFixture({ baseline, candidate: side('v2', 0.20, { skipService: true }) });
  assert.deepEqual(unused, { status: 'not-comparable', reason: 'INCOMPLETE_EVIDENCE' });
  const incomplete = await compareFixture({ baseline, candidate: side('v2', 0.20, { rejected: true }) });
  assert.deepEqual(incomplete, { status: 'not-comparable', reason: 'INCOMPLETE_EVIDENCE' });
});

test('installed public comparison reports tax change with network access disabled', () => {
  const c = installedPackage();
  try {
    const source = `import * as core from 'event-driven-design';
import { compareFixture } from 'event-driven-design/testing';
import { z } from 'zod';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
${comparisonCase.toString()}
const {baseline, candidate} = comparisonCase(core, z, randomUUID());
const result = await compareFixture({baseline, candidate});
assert.equal(result.status, 'changed-on-fixtures');
assert(result.changes.some(row => row.kind === 'output' && row.baseline.value === 10 && row.candidate.value === 20));
console.log('offline comparison passed');`;
    writeFileSync(join(c.fixture, 'compare.mjs'), source);
    assert.match(c.run(process.execPath, ['--permission', '--allow-fs-read=*', 'compare.mjs']), /offline comparison passed/);
  } finally { c.dispose(); }
});

test('lineage occurrences align across multiple fresh packets and unsafe gaps refuse a verdict', async () => {
  const { baseline, fixture } = comparisonCase(core, z, randomUUID());
  const repeated = { ...fixture, input: { amount: [{ value: 100, key: 'first' }, { value: 100, key: 'second' }] },
    dependencyScripts: { rates: [{ outcome: 'result', value: true }, { outcome: 'result', value: true }] },
    provenance: { ...fixture.provenance, inputSequences: [1, 2] } };
  const side = { ...baseline, fixture: repeated };
  const result = await compareFixture({ baseline: side, candidate: side });
  assert.equal(result.status, 'equal-on-fixtures');
  assert(result.unchanged.some(row => row.kind === 'output' && row.origin[0] === 'tax' && row.occurrence === 1));

  const { observeComparison } = require('../dist/cjs/testing/comparison/observations');
  const graph = baseline.build({ rates: () => true });
  const { runGraph } = require('../dist/cjs/testing');
  const run = await runGraph(graph, { inputs: { amount: [core.packet(100)] }, decisionEvidence: true });
  const origins = new Map([['split', 'split'], ['tax', 'tax'], ['base', 'base']]);
  assert.throws(() => observeComparison(run, new Map()), { code: 'INCOMPLETE_EVIDENCE' });
  for (const field of ['diagnostics', 'decisions']) {
    assert.throws(() => observeComparison({ ...run, [field]: { ...run[field], dropped: 1 } }, origins), { code: 'INCOMPLETE_EVIDENCE' });
  }
  const events = run.diagnostics.events.map(row => row.kind === 'sent'
    ? { ...row, packet: { ...row.packet, parentPacketIds: [randomUUID()] } } : row);
  assert.throws(() => observeComparison({ ...run, diagnostics: { ...run.diagnostics, events } }, origins), { code: 'INCOMPLETE_EVIDENCE' });
  const terminal = { kind: 'run-terminal', status: 'failed', code: 'FLOW_TIMEOUT' };
  const failed = observeComparison({ ...run, diagnostics: { ...run.diagnostics, events: [...run.diagnostics.events, terminal] } }, origins);
  assert.deepEqual([...failed.values()].find(row => row.kind === 'failure').values, [{ status: 'failed', code: 'FLOW_TIMEOUT', node: null }]);
});
