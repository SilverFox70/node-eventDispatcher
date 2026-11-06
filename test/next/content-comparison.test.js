const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, cpSync, mkdtempSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { performance } = require('node:perf_hooks');

const app = process.env.FBP_NEXT_APP;
const sample = join(app, 'lib/s24f');
const bytes = readFileSync(join(sample, 'comparison/cases.json'));
const cases = JSON.parse(bytes);
const load = path => import(pathToFileURL(path).href);

async function exercise(run, row, FlowError) {
  const controller = new globalThis.AbortController();
  if (row.preAbort) controller.abort();
  const attempts = [];
  let aborts = 0, inflight = 0, peak = 0;
  const result = await run(row.product, async (input, signal, attempt) => {
    assert.deepEqual(input, row.product);
    const step = row.media[attempts.length];
    attempts.push(attempt);
    peak = Math.max(peak, ++inflight);
    try {
      if (step === 'error') throw Error('Scripted permanent failure');
      if (step === 'retry') throw new FlowError('MEDIA_TEMPORARY');
      if (step === 'invalid') return [{ field: 'altText', message: 42 }];
      if (step === 'missing-alt') return [{ field: 'altText', message: 'Describe the product image.' }];
      if (step === 'pass') return [];
      assert(['cancel', 'wait'].includes(step), 'The runner called an unscripted service');
      return await new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { aborts++; reject(signal.reason); }, { once: true });
        if (step === 'cancel') controller.abort();
      });
    } finally { inflight--; }
  }, controller.signal);
  const { status, code } = result.terminal;
  return { result, facts: { status, code, review: result.review, attempts, aborts, peak } };
}

async function loadRunners() {
  const installed = join(app, 'node_modules/event-driven-design');
  const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  const { FlowError } = await load(join(installed, manifest.exports['.'].import.default));
  const graph = await load(join(app, 'lib/content-review/run.ts'));
  const plain = await load(join(sample, 'plain-typescript/review.ts'));
  return { FlowError, graph, plain };
}

test('packed graph and plain handler agree on fixed output, failure, effect and cancellation facts before measurement', async t => {
  const { FlowError, graph, plain } = await loadRunners();
  const { admitProduct } = await load(join(app, 'lib/content-review/product.ts'));
  assert.equal(admitProduct([]).ok, false);
  for (const row of cases) {
    assert.equal(admitProduct(row.product).ok, true);
    const graphRun = await exercise(graph.runReview, row, FlowError);
    const plainRun = await exercise(plain.plainReview, row, FlowError);
    assert.deepEqual(graphRun.facts, plainRun.facts, row.name);
    const { status, code, review, attempts, aborts, peak } = plainRun.facts;
    assert.deepEqual({ status, code, attempts, aborts }, { status: row.status, code: row.code, attempts: row.attempts, aborts: row.aborts });
    assert.equal(review?.preview?.title ?? null, row.preview);
    assert.deepEqual(review?.findings.map(finding => finding.field) ?? [], row.fields);
    assert.equal(peak, attempts.length ? 1 : 0);
    if (row.name === 'lamp') {
      assert(graphRun.result.explanation.explanation.nodes.some(node => node.record.code === 'ARCHIVED'));
      assert(plainRun.result.events.some(event => event.outcome === 'ARCHIVED'));
    }
  }
  t.diagnostic('Fixture SHA-256 ' + createHash('sha256').update(bytes).digest('hex'));
  const elapsed = { graph: [], plain: [] };
  for (let i = 0; i < 25; i++) {
    const runners = [['graph', graph.runReview], ['plain', plain.plainReview]];
    if (i % 2) runners.reverse();
    for (const [name, run] of runners) {
      const start = performance.now();
      await exercise(run, cases[0], FlowError);
      if (i >= 5) elapsed[name].push(performance.now() - start);
    }
  }
  const statistics = values => {
    const sorted = [...values].sort((a, b) => a - b);
    return { medianMs: (sorted[9] + sorted[10]) / 2, p95Ms: sorted[18] };
  };
  t.diagnostic(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch,
    graph: statistics(elapsed.graph), plain: statistics(elapsed.plain), samples: 20, harnessPeakRssKiB: process.resourceUsage().maxRSS }));
});

test('same seeded publication check changes both versions and produces diagnosis evidence', async () => {
  const { FlowError, plain } = await loadRunners();
  assert.deepEqual(plain.checkContent(cases[1].product).map(finding => finding.field), ['description']);
  assert.deepEqual(plain.checkRules(cases[1].product).map(finding => finding.field), ['slug']);
  const temporary = mkdtempSync(join(app, 'comparison-edit-'));
  cpSync(join(app, 'lib/content-review'), join(temporary, 'graph'), { recursive: true });
  cpSync(join(sample, 'plain-typescript'), join(temporary, 'plain'), { recursive: true });
  const graphPath = join(temporary, 'graph/nodes.ts'), plainPath = join(temporary, 'plain/review.ts');
  const graphSource = readFileSync(graphPath, 'utf8'), plainSource = readFileSync(plainPath, 'utf8');
  const check = "{ field: 'slug', message: 'Reserve chair for the catalog index.' }";
  const changedGraph = graphSource.replace('handler: value => /^[a-z', "handler: value => value.slug === 'chair' ? [" + check + '] : /^[a-z');
  const changedPlain = plainSource.replace('  return /^[a-z', "  if (product.slug === 'chair') return [" + check + '];\n  return /^[a-z');
  assert.notEqual(changedGraph, graphSource); assert.notEqual(changedPlain, plainSource);
  writeFileSync(graphPath, changedGraph); writeFileSync(plainPath, changedPlain);
  const graph = await load(join(temporary, 'graph/run.ts'));
  const replacement = await load(plainPath);
  const a = await exercise(graph.runReview, cases[0], FlowError);
  const b = await exercise(replacement.plainReview, cases[0], FlowError);
  assert.deepEqual(a.facts, b.facts);
  assert.equal(a.facts.review.preview, null);
  assert.equal(a.facts.review.findings[0].message, 'Reserve chair for the catalog index.');
  assert(a.result.explanation.explanation.nodes.some(node => node.record.nodeId === 'rules' && node.record.kind === 'sent'));
  assert(b.result.events.some(event => event.stage === 'rules' && event.outcome === 'findings'));
  assert(b.result.events.some(event => event.stage === 'report' && event.outcome === 'findings'));
});

test('seeded missing preview is attributed to the changed eligibility predicate', async () => {
  const { FlowError } = await loadRunners();
  const temporary = mkdtempSync(join(app, 'comparison-defect-'));
  cpSync(join(app, 'lib/content-review'), join(temporary, 'graph'), { recursive: true });
  cpSync(join(sample, 'plain-typescript'), join(temporary, 'plain'), { recursive: true });
  const graphPath = join(temporary, 'graph/nodes.ts'), plainPath = join(temporary, 'plain/review.ts');
  const graphSource = readFileSync(graphPath, 'utf8'), plainSource = readFileSync(plainPath, 'utf8');
  const changedGraph = graphSource.replace('if (!value.archived) return true;', 'if (value.archived) return true;');
  const changedPlain = plainSource.replace('if (product.archived)', 'if (!product.archived)');
  assert.notEqual(changedGraph, graphSource); assert.notEqual(changedPlain, plainSource);
  writeFileSync(graphPath, changedGraph); writeFileSync(plainPath, changedPlain);
  const graph = await load(join(temporary, 'graph/run.ts'));
  const plain = await load(plainPath);
  const dropped = { ...cases[0], media: [] };
  const a = await exercise(graph.runReview, dropped, FlowError);
  const b = await exercise(plain.plainReview, dropped, FlowError);
  assert.deepEqual(a.facts, b.facts);
  assert.equal(a.facts.review, null);
  assert(a.result.explanation.explanation.nodes.some(node =>
    node.record.nodeId === 'eligibility' && node.record.code === 'ARCHIVED' && node.record.outcome === 'drop'));
  assert(b.result.events.some(event => event.stage === 'eligibility' && event.outcome === 'ARCHIVED'));
});

test('an already-aborted content request returns the cancelled terminal from the installed route', async () => {
  const { command } = await import('../../scripts/next/process.mjs');
  const route = pathToFileURL(join(app, 'app/api/content-review/route.ts')).href;
  const result = await command(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { POST } = await import(${JSON.stringify(route)});
    const controller = new AbortController();
    const request = new Request('http://localhost/api/content-review', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(${JSON.stringify(cases[0].product)}), signal: controller.signal,
    });
    controller.abort();
    const response = await POST(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.terminal, { status: 'cancelled', code: 'CANCELLED' });
    assert.equal(body.review, null);
  `], { cwd: app, env: { NODE_V8_COVERAGE: join(process.env.FBP_NEXT_EVIDENCE, 'v8-test') } });
  assert.equal(result.code, 0, result.output);
});
