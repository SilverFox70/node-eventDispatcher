const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync, cpSync, rmSync } = require('node:fs');
const { join, relative } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');
function filesIn(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path, root) : [relative(root, path).split('\\').join('/')];
  });
}

test('consumer uses packed package: exact public manifest and no private execution material', () => {
  const c = installedPackage();
  try {
    const pkg = JSON.parse(readFileSync(join(c.root, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.files, ['dist', 'src', 'server/src/eventDispatcher.js', 'examples', 'templates', 'docs/guide.md', 'docs/migration.md', 'docs/architecture/fbp-runtime.md']);
    const expected = ['README.md', 'LICENSE', 'package.json', ...pkg.files.flatMap(path =>
      ['dist', 'src', 'examples', 'templates'].includes(path) ? filesIn(join(c.root, path)).map(file => `${path}/${file}`) : [path])].sort();
    assert.deepEqual([...c.files].sort(), expected);
    assert.deepEqual(pkg.dependencies, { zod: '4.6.7' });
    assert.equal(pkg.license, 'ISC'); assert(readFileSync(join(c.installed, 'LICENSE'), 'utf8').includes('William F Brinkert'));
    assert(!c.files.some(file => /(^|\/)(\.env|\.feedback-log|AGENTS\.md|node_modules|test)(\/|$)|cursor_plans/.test(file)));
  } finally { c.dispose(); }
});

test('built distributions usable: same-format public helpers and cross-format handles refuse', () => {
  const c = installedPackage();
  try {
    rmSync(join(c.installed, 'src'), { recursive: true });
    const output = c.run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
      import * as esm from 'event-driven-design'; import { runNode, runGraph } from 'event-driven-design/testing';
      const require = createRequire(import.meta.url), cjs = require('event-driven-design'), ct = require('event-driven-design/testing');
      function graph(f) { const n = f.map(f.jsonContract, f.jsonContract, value => value * 2);
        const g = f.createGraph(), h = g.add('n', n); g.exposeInput('in', h, 'in'); g.exposeOutput('out', h, 'out');
        const compiled = f.compileGraph(g.toSpec(), { 'map@1': n }); assert(compiled.ok); return { n, graph: compiled.graph }; }
      const e = graph(esm), c = graph(cjs);
      assert.throws(() => cjs.startNetwork(e.graph), { code: 'INVALID_ARGUMENT' });
      assert.throws(() => esm.startNetwork(c.graph), { code: 'INVALID_ARGUMENT' });
      for (const [f, node, g, testing] of [[esm,e.n,e.graph,{runNode,runGraph}],[cjs,c.n,c.graph,ct]]) {
        const p = f.packet(2, {jobId:'installed-job',key:'x'});
        for (const r of [await testing.runNode(node,{inputs:{in:[p]}}),await testing.runGraph(g,{inputs:{in:[p]}})]) {
          assert.equal(r.terminal.status,'completed'); assert.equal(r.outputs.out[0].value,4);
          assert.equal(r.outputs.out[0].jobId,p.jobId); assert.deepEqual(r.outputs.out[0].parentPacketIds,[p.packetId]);
        }
      }
      const model = await import('event-driven-design/model');
      for (const [f, g] of [[esm,e.graph],[cjs,c.graph]]) {
        const run = f.startNetwork(g, {diagnostics:{limit:32},capturePolicy:{allowedNodes:['n'],denyInputs:[],denyOutputs:[],maxPayloadBytes:32,maxSessionMs:1000}});
        const session = run.openDiagnosticsSession({rules:[{nodeId:'n',inputs:true,outputs:true}],expiresInMs:1000});
        const batches = []; const sink = f.attachDiagnosticsSink(run,{write:async batch=>{batches.push(batch);}});
        const reading = (async()=>{ for await (const result of run.outputs.out) assert.equal(result.value,4); })();
        const input = f.packet(2,{jobId:'installed-diagnostics'});
        await run.send('in',input); run.closeInput('in'); assert.equal((await run.done).status,'completed'); await reading;
        const diagnostic = run.diagnostics(); assert.deepEqual(model.validateDiagnostics(JSON.parse(JSON.stringify(diagnostic))),{ok:true});
        assert.equal(diagnostic.events.find(record=>record.kind==='attempt-started').inputs[0].packetId,input.packetId);
        assert(!diagnostic.events.some(record=>Object.hasOwn(record,'payload')));
        assert.equal(diagnostic.events.find(record=>record.kind==='received').capture.value,2);
        assert.equal(diagnostic.events.find(record=>record.kind==='sent').capture.value,4);
        assert.equal(session.snapshot().status,'terminated');
        assert(session.snapshot().events.every(record=>record.captureSessionId===session.snapshot().sessionId));
        assert.deepEqual(await sink.flush({timeoutMs:1000}),{complete:true});
        assert(batches.length>0); assert(batches.every(batch=>model.validateDiagnosticBatch(batch).ok));
        assert(batches.every(batch=>batch.events.every(record=>!record.capture)));
        const exported=f.exportDiagnostics(diagnostic).trim().split('\\n').map(JSON.parse);
        assert(exported.every(batch=>model.validateDiagnosticBatch(batch).ok)); await sink.dispose();
      }
      for (const f of [esm,cjs]) {
        const definition=f.defineComponent({...f.filter(f.jsonContract,(value,ctx)=>{
          assert(ctx.recordDecision({code:'SMALL',ruleVersion:'v1',outcome:'drop',facts:[{name:'amount',sourcePacketId:ctx.packet.packetId,fieldPath:'/amount'}]}));return false;
        }),decisions:[{code:'SMALL',ruleVersion:'v1',outcomes:['drop'],facts:['amount']}]});
        const builder=f.createGraph(),h=builder.add('eligibility',definition);builder.exposeInput('in',h,'in');builder.exposeOutput('out',h,'out');
        const registry={'filter@1':definition},compiled=f.compileGraph(builder.toSpec(),registry);assert(compiled.ok);
        assert(model.validateDecisionCatalog(f.describeDecisions(registry)).ok);assert(model.validateCatalog(f.describeRegistry(registry)).ok);
        const run=f.startNetwork(compiled.graph);const reading=(async()=>{for await(const value of run.outputs.out)assert.fail('Drop must not output');})();
        await run.send('in',f.packet({amount:4},{jobId:'installed-decision'}));await run.finish();await reading;
        const evidence=f.decisionSnapshot(run);assert(model.validateDecisions(JSON.parse(JSON.stringify(evidence))).ok);
        assert.deepEqual(evidence.events.map(e=>e.format),['nodeflow.decision','nodeflow.filter']);
        assert.equal(evidence.events[0].inputs[0].jobId,'installed-decision');assert.equal(evidence.events[1].outcome,'drop');
      }
      console.log('same-format helpers: 4; cross-format handles: INVALID_ARGUMENT');
    `]);
    assert.match(output, /same-format helpers: 4; cross-format handles: INVALID_ARGUMENT/);
    for (const file of ['consumer.mts', 'consumer.cts', 'tsconfig.json']) cpSync(join(c.root, 'test/types/consumer', file), join(c.fixture, file));
    c.run(process.execPath, [join(c.root, 'node_modules/typescript/bin/tsc'), '-p', join(c.fixture, 'tsconfig.json')]);
    // A source alias or accidental checkout resolution must not conceal missing installed declarations.
    rmSync(join(c.installed, 'dist/cjs/testing/index.d.ts'));
    const broken = c.attempt(process.execPath, [join(c.root, 'node_modules/typescript/bin/tsc'), '-p', join(c.fixture, 'tsconfig.json')]);
    assert.notEqual(broken.status, 0); assert.match(broken.stdout, /TS7016/);
  } finally { c.dispose(); }
});


test('cold consumer cache needs only locked tarball bytes, not registry metadata', () => {
  const c = installedPackage({ tools: true, contentOnlyCache: true });
  try {
    c.run(process.execPath, ['-e', "const assert=require('node:assert/strict');assert.equal(typeof require('event-driven-design/testing').runNode,'function');require('typescript');require('undici-types/package.json');"]);
    c.run(process.execPath, [join(c.fixture, 'node_modules/typescript/bin/tsc'), '--version']);
  } finally { c.dispose(); }
});
