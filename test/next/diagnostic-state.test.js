const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const app = process.env.FBP_NEXT_APP;
const moduleAt = name => import(pathToFileURL(join(app, 'lib', name)));
const deferred = () => Promise.withResolvers();
function specimen() {
  const runId = randomUUID();
  const records = { version: 1, runId, total: 0, dropped: 0, events: [] };
  const inspection = { version: 1, sources: [{ id: 'flow', kind: 'graph', spec: { version: 1, nodes: [{ id: 'stats', component: 'echo@1' }], edges: [],
    inputs: { in: { node: 'stats', port: 'in' } }, outputs: { out: { node: 'stats', port: 'out' } } },
    catalog: { version: 1, components: [{ id: 'echo', version: 1, title: 'Echo', description: '',
      in: { in: { contractId: 'json@1', representationId: 'json@1', schema: {} } }, out: { out: { contractId: 'json@1', representationId: 'json@1', schema: {} } } }] },
    run: { runId, status: 'running', nodes: [{ id: 'stats', status: 'running' }], channels: [], diagnostics: [] } }] };
  const view = { version: 1, token: randomUUID(), sourceId: 'flow', runId, records, decisions: { format: 'nodeflow.decisions', version: 1, runId, total: 0, dropped: 0, rejected: 0, events: [] }, busy: false, submitted: 0, completed: 0,
    session: { sessionId: randomUUID(), epoch: 1, status: 'active', remainingMs: 1000, effectiveRules: [] } };
  return { inspection, view };
}

test('diagnostic frame admission rejects malformed state and cross-source/run/session selectors', async () => {
  const { readDiagnosticView, latestDiagnosticView } = await moduleAt('diagnostic-model.ts');
  const { inspection, view } = specimen();
  assert.equal(readDiagnosticView(view, inspection), view);
  const mutations = [null, [], {}, { ...view, extra: 1 }, { ...view, version: 2 }, { ...view, token: 'bad' }, { ...view, sourceId: 'other' },
    { ...view, runId: randomUUID() }, { ...view, records: { ...view.records, runId: randomUUID() } }, { ...view, busy: 1 },
    { ...view, decisions: { ...view.decisions, version: 2 } },
    { ...view, decisions: { ...view.decisions, runId: randomUUID() } },
    { ...view, submitted: -1 }, { ...view, submitted: 31 }, { ...view, completed: 1 },
    ...[{ epoch: 0 }, { status: 'other' }, { remainingMs: -1 }, { remainingMs: 60001 }, { sessionId: 'bad' },
      { effectiveRules: {} }, { effectiveRules: Array(33).fill({}) }, { effectiveRules: [{ nodeId: 'other', inputs: true, outputs: false }] },
      { effectiveRules: [{ nodeId: 'stats', inputs: 1, outputs: false }] },
      { effectiveRules: [{ nodeId: 'stats', inputs: true, outputs: false }, { nodeId: 'stats', inputs: false, outputs: true }] }]
      .map(patch => ({ ...view, session: { ...view.session, ...patch } }))];
  for (const value of mutations) assert.throws(() => readDiagnosticView(value, inspection));
  assert.equal(readDiagnosticView({ ...view, session: { ...view.session, status: 'expired', effectiveRules: [{ nodeId: 'stats', inputs: true, outputs: false }] } }, inspection).session.status, 'expired');
  assert.equal(latestDiagnosticView(null, view), view);
  assert.equal(latestDiagnosticView(view, { ...view, token: randomUUID() }).runId, view.runId);
  const current = { ...view, submitted: 3, completed: 3, session: { ...view.session, epoch: 3 } };
  assert.equal(latestDiagnosticView(current, view), current);
  assert.equal(latestDiagnosticView(current, { ...current, submitted: 0, completed: 0 }), current);
  assert.equal(latestDiagnosticView(current, { ...current, completed: 0 }), current);
  assert.equal(latestDiagnosticView(current, { ...current, records: { ...view.records, total: -1 } }), current);
  assert.equal(latestDiagnosticView(current, { ...current, decisions: { ...view.decisions, total: -1 } }), current);
});

function connectionHarness(connect, initial = specimen()) {
  let source, current, requests = [], reply = deferred();
  const controls = connect(state => { current = state; }, () => (source = { close() { this.closed = true; } }),
    async (url, options) => { requests.push({ url, options }); return reply.promise; });
  const message = (sequence, spec = initial) => source.onmessage({ data: JSON.stringify({ sequence, snapshot: spec.inspection, diagnostics: spec.view }) });
  return { controls, get state() { return current; }, get source() { return source; }, requests,
    reply: result => reply.resolve(result), nextReply() { reply = deferred(); }, message, initial };
}

test('control transport binds exact selectors and discards stale responses, callbacks and exports', async () => {
  const { connectDiagnosticControls } = await moduleAt('diagnostic-connection.ts');
  const h = connectionHarness(connectDiagnosticControls);
  assert.equal(await h.controls.command({ action: 'load' }), null);
  h.source.onopen(); h.message(1);
  const sending = h.controls.command({ action: 'capture', nodeId: 'stats', inputs: true, outputs: false });
  assert.equal(h.state.pending, true); assert.equal(await h.controls.command({ action: 'load' }), null);
  const request = JSON.parse(h.requests[0].options.body);
  assert.equal(request.sourceId, 'flow'); assert.equal(request.runId, h.initial.view.runId); assert.equal(request.token, h.initial.view.token);
  assert.equal(request.sessionId, h.initial.view.session.sessionId); assert.equal(request.expectedEpoch, 1); assert.equal(request.nodeId, 'stats');
  const newer = { ...h.initial, view: { ...h.initial.view, session: { ...h.initial.view.session, epoch: 3 } } };
  h.message(2, newer); h.reply(new globalThis.Response(JSON.stringify(h.initial.view))); await sending;
  assert.equal(h.state.view.session.epoch, 3); assert.equal(h.state.pending, false);
  h.nextReply(); const old = h.controls.command({ action: 'load' });
  const replacement = specimen(); h.message(3, replacement);
  assert.equal(h.requests[1].options.signal.aborted, true); assert.equal(h.state.pending, false);
  h.reply(new globalThis.Response(JSON.stringify(h.initial.view))); await old;
  assert.equal(h.state.view.runId, replacement.view.runId);
  h.nextReply(); const failing = h.controls.command({ action: 'load' }); h.reply(new globalThis.Response('{}', { status: 409 })); await failing;
  assert(h.state.error.includes('Control unavailable'));
  h.nextReply(); const exporting = h.controls.command({ action: 'export', includeCaptures: false });
  h.reply(new globalThis.Response(JSON.stringify({ version: 1, runId: replacement.view.runId, captureMode: 'omitted',
    loss: { sourceRecords: 0, droppedRecords: 0, droppedBytes: 0 }, events: [] }) + '\n'));
  assert((await exporting).includes('"captureMode":"omitted"'));
  h.nextReply(); const bad = h.controls.command({ action: 'export', includeCaptures: true }); h.reply(new globalThis.Response('{}\n'));
  assert.equal(await bad, null); assert(h.state.error);
  h.nextReply(); const late = h.controls.command({ action: 'load' }); h.controls.dispose(); h.controls.dispose();
  assert(h.requests.at(-1).options.signal.aborted); h.reply(new globalThis.Response('{}')); await late;
  const saved = h.state; h.message(4); h.source.onopen(); h.source.onerror(); assert.equal(h.state, saved);
  assert.equal(await h.controls.command({ action: 'load' }), null);
  const invalid = connectionHarness(connectDiagnosticControls);
  invalid.source.onmessage({ data: JSON.stringify({ sequence: 1, snapshot: invalid.initial.inspection }) });
  assert.equal(invalid.state.status, 'Invalid inspection data'); assert(invalid.source.closed); invalid.controls.dispose();
  const { downloadDiagnostics } = await moduleAt('diagnostic-download.ts');
  await downloadDiagnostics({ command: async () => null }, false);
});


test('host demo expiry and observer ownership survive failures, removal and idempotent disposal', async () => {
  const { command } = await import('../../scripts/next/process.mjs');
  const url = pathToFileURL(join(app, 'lib/diagnostic-demo.ts')).href;
  const result = await command(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict'; import { mock } from 'node:test';
    import { performance } from 'node:perf_hooks'; import { randomUUID } from 'node:crypto';
    const { createDiagnosticDemo } = await import(${JSON.stringify(url)});
    const demo = createDiagnosticDemo('account',randomUUID()); let notifications=0, failures=0, removed=0;
    assert.throws(()=>demo.subscribe(null),TypeError);
    let offRemoved; const first=demo.subscribe(()=>{offRemoved();failures++;throw Error('observer');});
    offRemoved=demo.subscribe(()=>removed++);
    const offs=Array.from({length:62},()=>demo.subscribe(()=>notifications++));
    assert.throws(()=>demo.subscribe(()=>{}),RangeError);
    demo.advance(); await new Promise(setImmediate); assert.equal(failures,1); assert.equal(removed,0); assert.equal(notifications,62);
    first();offRemoved();offs.forEach(off=>{off();off();});
    const active=demo.diagnostics(), start=performance.now();
    mock.method(performance,'now',()=>start+61000);
    const expired=demo.diagnostics(); assert.equal(expired.session.status,'expired');assert.equal(expired.session.remainingMs,0);
    const base={token:active.token,sourceId:active.sourceId,runId:active.runId,sessionId:active.session.sessionId,expectedEpoch:active.session.epoch};
    assert.throws(()=>demo.command({...base,action:'load'}),{code:'SESSION_CLOSED'});
    assert.equal(typeof demo.command({...base,action:'export',includeCaptures:false}),'string');
    let after=0;demo.subscribe(()=>after++);demo.advance();demo.dispose();demo.dispose();
    await new Promise(setImmediate);assert.equal(after,0);assert.deepEqual(demo.snapshot().sources,[]);
    assert.throws(()=>demo.command({...base,action:'load'}),{code:'FORBIDDEN'});mock.restoreAll();
  `], { cwd: app, env: { NODE_V8_COVERAGE: join(process.env.FBP_NEXT_EVIDENCE, 'v8-test') } });
  assert.equal(result.code,0,result.output);
});

test('a download that settles after navigation cannot create a stale browser export', async () => {
  const { connectDiagnosticControls } = await moduleAt('diagnostic-connection.ts');
  const h = connectionHarness(connectDiagnosticControls), entered = deferred(), text = deferred();
  h.source.onopen(); h.message(1);
  const exporting = h.controls.command({ action: 'export', includeCaptures: true });
  h.reply({ ok: true, text() { entered.resolve(); return text.promise; } });
  await entered.promise; h.controls.dispose(); text.resolve('{}\n');
  assert.equal(await exporting, null); assert(h.requests[0].options.signal.aborted);
});
