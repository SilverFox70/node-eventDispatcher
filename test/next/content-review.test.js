const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const browserFixture = require('./browser-fixture.cjs');

const chair = { slug: 'chair', title: 'Chair', description: 'Oak dining chair.', altText: 'Oak chair.', archived: false };
const upload = value => ({ name: 'product.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
const app = process.env.FBP_NEXT_APP;
const installed = join(app, 'node_modules/event-driven-design');
const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
const installedExport = entry => import(pathToFileURL(join(installed, manifest.exports[entry].import.default)).href);
const moduleAt = name => import(pathToFileURL(join(app, 'lib/content-review', name)).href);
let fixture;
before(async () => { fixture = await browserFixture('content-review'); });
after(async () => { await fixture?.close(); });

test('installed content review admits form and JSON through the same workflow', async () => {
  const view = await fixture.open(), page = view.page;
  try {
    await page.goto(fixture.server.url);
    await page.getByRole('link', { name: 'Open product content review' }).click();
    await page.getByLabel('description', { exact: true }).fill('An oak chair.');
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByRole('region', { name: 'Product preview' }).getByText('An oak chair.').waitFor();
    await page.getByText('Explain this output').click();
    await page.getByText('collate · sent', { exact: true }).waitFor();
    assert.match(await page.getByText(/Packet parent links/).textContent(), /[1-9]/);
    assert(await page.getByRole('list', { name: 'Packet ancestry' }).getByRole('listitem').count() >= 4);
    const file = page.getByLabel('Upload product JSON');
    await file.setInputFiles(upload({ ...chair, slug: 'Table?', title: '', description: '', altText: '' }));
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByText('Add a product description.', { exact: true }).waitFor();
    await page.getByText('Add a product title.', { exact: true }).waitFor();
    await page.getByText('Describe the product image.', { exact: true }).waitFor();
    await page.getByText('Use lowercase words separated by hyphens.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Product preview' }).count(), 0);
    await file.setInputFiles(upload({ ...chair, slug: 'lamp', title: 'Lamp', archived: true }));
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByText('No preview emitted', { exact: true }).waitFor();
    await page.getByText('Explain this input').click();
    await page.getByText('Reported ARCHIVED', { exact: true }).waitFor();
    await page.getByText('Observed drop', { exact: true }).waitFor();
    await file.setInputFiles(upload([]));
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByText('product: invalid_type', { exact: true }).waitFor();
    await file.setInputFiles(upload('x'.repeat(4097)));
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByText('JSON file exceeds 4 KiB', { exact: true }).waitFor();
    await file.setInputFiles([]);
    await page.getByLabel('Archived').check();
    await page.getByRole('button', { name: 'Review product' }).click();
    await page.getByText('No preview emitted', { exact: true }).waitFor();
  } finally { await view.close(); }
});

test('installed content review shows retry, invalid output and cancellation states', async () => {
  const view = await fixture.open(), page = view.page;
  try {
    await page.goto(fixture.server.url + '/content-review');
    const mode = page.getByLabel('Media demo scenario'), submit = page.getByRole('button', { name: 'Review product' });
    await mode.selectOption('retry'); await submit.click();
    await page.getByText('Review complete', { exact: true }).waitFor();
    await page.getByText('Explain this output').click();
    assert.equal(await page.getByText('media · attempt-finished', { exact: true }).count(), 2);
    await mode.selectOption('invalid'); await submit.click();
    await page.getByRole('status').filter({ hasText: 'OUTPUT_CONTRACT' }).waitFor();
    await mode.selectOption('slow'); await submit.click();
    await page.getByText('Reviewing', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cancel review' }).click();
    await page.getByText('Review cancelled', { exact: true }).waitFor();
    await page.route('**/api/content-review?*', route => route.abort());
    await submit.click();
    await page.getByText('Review unavailable', { exact: true }).waitFor();
  } finally { await view.close(); }
});

test('invalid request metadata refuses safely', async () => {
  for (const [query, body, code] of [['?media=unknown', '{}', 'invalid_mode'], ['', '{', 'invalid_json']]) {
    const response = await globalThis.fetch(fixture.server.url + '/api/content-review' + query, {
      method: 'POST', body, headers: { 'content-type': 'application/json' },
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).issues[0].code, code);
  }
});

test('isolated installed nodes and controlled media effects exercise the real graph', async () => {
  const f = await installedExport('.');
  const { runNode } = await installedExport('./testing');
  const { content, media, rules, activeProduct } = await moduleAt('nodes.ts');
  const { runReview, reviewInput } = await moduleAt('run.ts');
  for (const node of [content, media(async () => []), rules]) {
    const result = await runNode(node, { inputs: { in: [f.packet(chair)] } });
    assert.deepEqual(result.outputs.out[0].value, []);
  }
  const { reviewGraph } = await moduleAt('graph.ts');
  const { summary } = reviewGraph(async () => []);
  const joined = f.packet({ product: chair, content: [], media: [], rules: [] });
  const summarized = await runNode(summary, { inputs: { in: [joined] } });
  assert.deepEqual(summarized.outputs.out[0].value, { findings: [], preview: { title: 'Chair', description: chair.description } });
  const drop = await runNode(activeProduct, { inputs: { in: [f.packet({ ...chair, archived: true })] }, decisionEvidence: true });
  assert.deepEqual(drop.outputs.out, []);
  assert(drop.decisions.events.some(row => row.code === 'ARCHIVED'));
  const controller = new globalThis.AbortController();
  let calls = 0, cancelled = false;
  const signal = controller.signal;
  const malformed = await reviewInput([], async () => { calls++; return []; }, signal);
  assert.deepEqual(malformed, { ok: false, issues: [{ field: 'product', code: 'invalid_type' }] });
  assert.equal(calls, 0);
  await assert.rejects(runReview({ ...chair, title: 42 }, async () => { calls++; return []; }, signal),
    { code: 'INPUT_CONTRACT' });
  assert.equal(calls, 0);
  const result = await runReview(chair, async (_product, serviceSignal) => {
    calls++;
    const cancellation = new Promise(resolve => serviceSignal.addEventListener('abort', () => { cancelled = true; resolve([]); }, { once: true }));
    controller.abort();
    return cancellation;
  }, signal);
  assert.equal(result.terminal.status, 'cancelled');
  assert.equal(result.review, null);
  assert.equal(calls, 1);
  assert(cancelled);
  const attempts = [];
  const recovered = await runReview(chair, async (_product, _signal, attempt) => {
    attempts.push(attempt);
    if (attempt === 1) throw new f.FlowError('MEDIA_TEMPORARY');
    return [];
  }, new globalThis.AbortController().signal);
  assert.deepEqual(attempts, [1, 2]);
  assert.equal(recovered.review.preview.title, 'Chair');
  const { demoMedia } = await moduleAt('media.ts');
  const slow = await runReview(chair, demoMedia('slow'), new globalThis.AbortController().signal);
  assert.equal(slow.review.preview.title, 'Chair');
});

test('captured installed chair case exports and replays with reviewed values', async () => {
  const core = await installedExport('.');
  const testing = await installedExport('./testing');
  const { reviewGraph } = await moduleAt('graph.ts');
  const graph = reviewGraph(async () => []);
  const run = core.startNetwork(graph.compiled, { capturePolicy: { allowedNodes: ['eligibility', 'report'],
    denyInputs: [], denyOutputs: [], maxPayloadBytes: 1024, maxSessionMs: 1000 } });
  run.openDiagnosticsSession({ rules: [{ nodeId: 'eligibility', inputs: true, outputs: false }, { nodeId: 'report', inputs: false, outputs: true }], expiresInMs: 1000 });
  let result;
  const drain = (async () => { for await (const row of run.outputs.review) result = row; })();
  await run.send('product', core.packet(chair, { jobId: 'chair-review', key: 'chair' })); await run.finish(); await drain;
  const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  const paths = ['graph.ts', 'nodes.ts', 'product.ts'];
  const lock = digest(join(app, 'package-lock.json'));
  const implementation = core.implementationIdentity({ version: 1, files: paths.map(path => ({ path, sha256: digest(join(app, 'lib/content-review', path)) })),
    lockDigest: lock, toolchain: { node: process.version, compiler: 'node-strip-types' }, dependencyRoles: [] }, paths);
  assert.equal(implementation.status, 'verified');
  const identity = core.executionIdentity({ graph: graph.spec, bindings: graph.spec.nodes.map(node => ({
    component: node.component, implementationDigest: implementation.digest, contractsDigest: implementation.digest,
  })), runtimeVersion: process.version, policyVersion: '1', serviceProfileDigest: lock });
  assert.equal(identity.status, 'verified');
  const diagnostics = run.diagnostics();
  const fixture = { format: 'nodeflow.fixture', version: 1, caseId: 'chair-case', executionIdentity: identity.digest,
    input: { product: [{ value: { ...chair, title: 'Sample chair' }, key: 'chair' }] },
    expected: { outputs: { review: [{ value: { ...result.value, preview: { ...result.value.preview, title: 'Sample chair' } }, key: 'chair' }] }, decisions: [] },
    dependencyScripts: { media: [{ outcome: 'result', value: [] }] },
    redactionReview: { reviewId: 'sample', substitutions: ['/input/product/0/value/title', '/expected/outputs/review/0/value/preview/title'] },
    provenance: { runId: run.runId, inputSequences: [diagnostics.events.find(row => row.kind === 'input-admitted').sequence],
      outputSequences: [diagnostics.events.find(row => row.kind === 'sent' && row.nodeId === 'report').sequence] } };
  const approve = value => value.input.product[0].value.title === 'Sample chair';
  const prepared = testing.prepareRegressionFixture(graph.compiled, { format: 'nodeflow.evidence', version: 1,
    runId: run.runId, diagnostics, decisions: core.decisionSnapshot(run), identity }, 'chair-review', fixture, { roles: ['media'], approve });
  await testing.runRegressionFixture(prepared, { roles: ['media'], approve, executionIdentity: identity.digest,
    build: services => reviewGraph(async () => services.media()).compiled });
  assert.equal(JSON.parse(JSON.stringify(prepared)).input.product[0].value.title, 'Sample chair');
  const directory = mkdtempSync(join(process.env.FBP_NEXT_EVIDENCE, 'review-export-'));
  const generated = await testing.writeRegressionTest(directory, prepared);
  assert.match(readFileSync(generated, 'utf8'), /Sample chair/);
});
