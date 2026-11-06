const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const f = require('../dist/cjs');
const model = require('../dist/cjs/model');
const fixture = require('./diagnostic-fixture');
const digest = '0'.repeat(64);
const noIdentity = { status: 'unverified' };
function evidence(run) {
  return { format: 'nodeflow.evidence', version: 1, runId: run.runId,
    diagnostics: run.diagnostics(), decisions: f.decisionSnapshot(run), identity: noIdentity };
}

test('joined output traces both immediate parents, original admission and both task attempts', async () => {
  const contract = f.jsonContract;
  const split = f.broadcast(contract, ['a', 'b']);
  const transform = id => f.defineFunction({ id, title: id, description: '', version: 1, input: contract, output: contract, handler: async n => n * 2 });
  const left = transform('left'), right = transform('right');
  const join = f.joinByKey({ a: contract, b: contract }, { outputId: 'result@1', maxKeys: 2 });
  const graph = f.createGraph();
  const s = graph.add('split', split), a = graph.add('a', left), b = graph.add('b', right), j = graph.add('join', join);
  graph.exposeInput('in', s, 'in'); graph.connect(s, 'a', a, 'in'); graph.connect(s, 'b', b, 'in');
  graph.connect(a, 'out', j, 'a'); graph.connect(b, 'out', j, 'b'); graph.exposeOutput('out', j, 'out');
  const compiled = f.compileGraph(graph.toSpec(), { 'broadcast@1': split, 'left@1': left, 'right@1': right, 'join-by-key@1': join });
  assert(compiled.ok);
  const run = f.startNetwork(compiled.graph);
  const outputs = (async () => { const results = []; for await (const packet of run.outputs.out) results.push(packet); return results; })();
  const input = f.packet(6, { jobId: 'joined-job', key: 'one' });
  await run.send('in', input); await run.finish();
  const [result] = await outputs;
  const snapshot = evidence(run);
  const sequences = snapshot.diagnostics.events.filter(row => row.kind === 'sent' && row.nodeId === 'join').map(row => row.sequence);
  const query = { runId: run.runId, subject: { kind: 'output', packetId: result.packetId, jobId: result.jobId }, maxRecords: 64 };
  const explained = model.explainCausal(snapshot, query, sequences);
  assert(explained.ok);
  const { nodes, links, gaps, coverage } = explained.explanation;
  assert.equal(coverage, 'complete-for-recorded-scope');
  assert.deepEqual(gaps, ['capture-off', 'identity-unverified']);
  assert.deepEqual(links.filter(link => link.child === result.packetId).map(link => link.parent), result.parentPacketIds);
  assert.equal(links.filter(link => link.parent === input.packetId).length, 2);
  assert(nodes.some(({ record }) => record.kind === 'input-admitted' && record.packet.packetId === input.packetId));
  assert.deepEqual(nodes.filter(({ record }) => record.kind === 'attempt-finished').map(({ record }) => record.nodeId).sort(), ['a', 'b']);
  assert(nodes.filter(({ record }) => record.kind === 'attempt-finished').every(({ record }) => record.durationMs >= 0));
  assert.equal(model.explainCausal(snapshot, { ...query, runId: randomUUID() }, sequences).issue, 'WRONG_RUN');
  assert.equal(model.explainCausal(snapshot, query, []).issue, 'UNKNOWN_SUBJECT');
  assert.equal(model.explainCausal(snapshot, { ...query, maxRecords: 0 }, sequences).issue, 'INVALID_QUERY');
  const partial = model.explainCausal(snapshot, { ...query, maxRecords: 2 }, sequences, false);
  assert(partial.ok && partial.explanation.gaps.includes('limit') && partial.explanation.gaps.includes('disconnect'));
  assert(partial.explanation.nodes.some(node => node.record.packet?.packetId === result.packetId));
  const evicted = globalThis.structuredClone(snapshot);
  const start = evicted.diagnostics.events.findIndex(record => sequences.includes(record.sequence));
  evicted.diagnostics.events.splice(0, start);
  evicted.diagnostics.dropped = start;
  const incomplete = model.explainCausal(evicted, query, sequences);
  assert(incomplete.ok && incomplete.explanation.gaps.includes('missing-parent'));
  assert(incomplete.explanation.gaps.includes('evicted'));
  assert.equal(incomplete.explanation.links.length, 0);
});

test('retained observations distinguish drop, undeclared reason and missing disposition', async () => {
  const runFixture = fixture.start(f.filter(f.jsonContract, () => false));
  const input = f.packet(4, { jobId: 'drop' });
  await runFixture.run.send('request', input); await runFixture.run.finish();
  assert.deepEqual(await runFixture.output, []);
  const snapshot = evidence(runFixture.run);
  const query = { runId: snapshot.runId, subject: { kind: 'input', packetId: input.packetId, jobId: input.jobId }, maxRecords: 64 };
  const drop = model.explainCausal(snapshot, query, []);
  assert(drop.ok && drop.explanation.gaps.includes('reason-undeclared'));
  assert(drop.explanation.nodes.some(node => node.stream === 'decision' && node.record.outcome === 'drop'));
  const lost = globalThis.structuredClone(snapshot);
  lost.decisions.events = []; lost.decisions.dropped = lost.decisions.total;
  const unknown = model.explainCausal(lost, query, []);
  assert(unknown.ok && unknown.explanation.gaps.includes('disposition-unknown') && unknown.explanation.gaps.includes('evicted'));
  assert(!unknown.explanation.nodes.some(node => node.stream === 'decision'));
  const foreign = globalThis.structuredClone(snapshot);
  foreign.decisions.runId = randomUUID(); foreign.decisions.events.forEach(event => { event.runId = foreign.decisions.runId; });
  assert.equal(model.explainCausal(foreign, query, []).issue, 'INVALID_EVIDENCE');
});

test('syntactically valid but cyclic or incomplete packet evidence produces explicit gaps', () => {
  const runId = randomUUID(), a = randomUUID(), b = randomUUID(), jobId = 'corrupt';
  const records = [a, b].map((packetId, index) => ({ version: 1, runId, sequence: index + 1, timeMs: index, kind: 'sent',
    nodeId: 'node', port: 'out', packet: { version: 1, packetId, jobId, parentPacketIds: [index ? a : b] } }));
  const snapshot = { format: 'nodeflow.evidence', version: 1, runId, diagnostics: { version: 1, runId, total: 2, dropped: 0, events: records },
    decisions: { format: 'nodeflow.decisions', version: 1, runId, total: 0, dropped: 0, rejected: 0, events: [] },
    identity: { status: 'verified', digest } };
  const query = { runId, subject: { kind: 'output', jobId, packetId: a }, maxRecords: 16 };
  const cyclic = model.explainCausal(snapshot, query, [1]);
  assert(cyclic.ok && cyclic.explanation.gaps.includes('cycle'));
  records[1].packet.parentPacketIds = [randomUUID()];
  const missing = model.explainCausal(snapshot, query, [1]);
  assert(missing.ok && missing.explanation.gaps.includes('missing-parent'));
  records[1].packet.parentPacketIds = [];
  const root = model.explainCausal(snapshot, query, [1]);
  assert(root.ok && root.explanation.gaps.includes('missing-admission'));
});

test('a changed emitted helper changes execution identity and incomplete provenance stays unverified', () => {
  const files = [{ path: 'handler.js', sha256: digest }, { path: 'helper.js', sha256: digest }];
  const manifest = { version: 1, files, lockDigest: digest, toolchain: { node: '26', compiler: '6' },
    dependencyRoles: [{ role: 'adapter', implementationDigest: digest, fixtureProfileDigest: digest }] };
  const paths = files.map(file => file.path);
  const before = f.implementationIdentity(manifest, paths);
  const after = f.implementationIdentity({ ...manifest, files: [files[0], { ...files[1], sha256: '1'.repeat(64) }] }, paths);
  assert.equal(before.status, 'verified'); assert.equal(after.status, 'verified'); assert.notEqual(after.digest, before.digest);
  assert.equal(f.implementationIdentity({ ...manifest, files: files.slice(0, 1) }, paths).status, 'unverified');
  assert.equal(f.implementationIdentity(manifest, ['../handler.js', 'helper.js']).status, 'unverified');
  const input = { graph: { version: 1, nodes: [{ id: 'a', component: 'a@1' }, { id: 'b', component: 'b@1' }], edges: [], inputs: {}, outputs: {} },
    bindings: [{ component: 'a@1', implementationDigest: before.digest, contractsDigest: digest },
      { component: 'b@1', implementationDigest: digest, contractsDigest: digest }],
    runtimeVersion: 'v1', policyVersion: 'v1', serviceProfileDigest: digest };
  const identity = f.executionIdentity(input);
  assert.equal(identity.status, 'verified');
  assert.deepEqual(f.executionIdentity({ ...input, bindings: input.bindings.toReversed() }), identity);
  assert.notDeepEqual(f.executionIdentity({ ...input, bindings: [{ ...input.bindings[0], implementationDigest: after.digest }, input.bindings[1]] }), identity);
  assert.equal(f.executionIdentity({ ...input, bindings: [] }).status, 'unverified');
});

test('passive evidence refuses malformed identity and foreign diagnostics while preserving truncation metadata', async () => {
  const { run, output } = fixture.start(f.filter(f.jsonContract, () => true));
  const input = f.packet(4, { jobId: 'pass' });
  await run.send('request', input); await run.finish(); assert.equal((await output).length, 1);
  const snapshot = evidence(run);
  assert(model.validateCausalEvidence(snapshot).ok);
  for (const patch of [{ version: 2 }, { extra: true }, { identity: { status: 'verified', digest: 'bad' } },
    { identity: { status: 'unverified', digest } }, { diagnostics: { ...snapshot.diagnostics, runId: randomUUID() } }]) {
    assert.equal(model.validateCausalEvidence({ ...snapshot, ...patch }).ok, false);
  }
  const record = snapshot.diagnostics.events.find(event => event.kind === 'input-admitted');
  const captured = { captureSessionId: randomUUID(), captureEpoch: 1, capture: { state: 'truncated', preview: '…', bytes: 100 } };
  const truncated = { ...snapshot, diagnostics: { ...snapshot.diagnostics,
    events: snapshot.diagnostics.events.map(event => event === record ? { ...event, ...captured } : event) } };
  const query = { runId: run.runId, subject: { kind: 'input', packetId: input.packetId, jobId: input.jobId }, maxRecords: 64 };
  const sent = snapshot.diagnostics.events.filter(event => event.kind === 'sent').map(event => event.sequence);
  const explanation = model.explainCausal(truncated, query, sent);
  assert(explanation.ok && explanation.explanation.gaps.includes('oversize'));
  assert(!explanation.explanation.gaps.includes('disposition-unknown'));
  assert(explanation.explanation.nodes.some(node => node.stream === 'decision' && node.record.outcome === 'keep'));
});

test('partial records never guess a missing attempt or accept conflicting packet metadata', async () => {
  const { run, output } = fixture.start(f.filter(f.jsonContract, () => true));
  const input = f.packet(8, { jobId: 'observed' });
  await run.send('request', input); await run.finish(); await output;
  const snapshot = evidence(run);
  const query = { runId: run.runId, subject: { kind: 'input', packetId: input.packetId, jobId: input.jobId }, maxRecords: 64 };
  const events = snapshot.diagnostics.events.map(event => event.kind === 'attempt-finished'
    ? { ...event, attemptId: randomUUID() } : event.kind === 'received'
      ? { ...event, packet: { ...event.packet, key: 'changed' } } : event);
  const result = model.explainCausal({ ...snapshot, diagnostics: { ...snapshot.diagnostics, events } }, query, []);
  assert(result.ok && result.explanation.gaps.includes('conflicting-packet'));
  assert(result.explanation.gaps.includes('missing-attempt-endpoint'));
  assert.equal(result.explanation.coverage, 'partial');
});

test('dense ancestry stops at the link budget while retaining the selected output', () => {
  const runId = randomUUID(), ids = Array.from({ length: 4 }, () => randomUUID());
  const events = ids.map((packetId, index) => ({ version: 1, runId, sequence: index + 1, timeMs: index,
    kind: 'sent', nodeId: 'node', port: 'out', packet: { version: 1, packetId, jobId: 'dense', parentPacketIds: ids.slice(0, index) } }));
  const snapshot = { format: 'nodeflow.evidence', version: 1, runId, diagnostics: { version: 1, runId, total: 4, dropped: 0, events },
    decisions: { format: 'nodeflow.decisions', version: 1, runId, total: 0, dropped: 0, rejected: 0, events: [] }, identity: noIdentity };
  const result = model.explainCausal(snapshot, { runId, subject: { kind: 'output', packetId: ids[3], jobId: 'dense' }, maxRecords: 4 }, [4]);
  assert(result.ok && result.explanation.gaps.includes('limit'));
  assert.equal(result.explanation.links.length, 4);
  assert(result.explanation.nodes.some(node => node.record.packet?.packetId === ids[3]));
});
