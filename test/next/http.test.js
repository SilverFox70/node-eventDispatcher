const { performance } = require('node:perf_hooks');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { writeFileSync } = require('node:fs');
const createHTTP = require('./http-fixture.cjs');
const { createRequire } = require('node:module');
const app = process.env.FBP_NEXT_APP, evidence = process.env.FBP_NEXT_EVIDENCE;
let upstream, server;
before(async () => {
  upstream = await createHTTP();
  const { startServer } = await import('../../scripts/next/server.mjs');
  server = await startServer(app, { pokemonBase: upstream.url, coverage: join(evidence, 'v8-server'), log: join(evidence, 'server-http.log') });
});
after(async () => { await server?.stop(); await upstream?.close(); });
async function completedRun() {
  const response = await globalThis.fetch(server.url + '/api/inspection?example=pokemon&payloads=1', { signal: globalThis.AbortSignal.timeout(25000) });
  const reader = response.body.getReader(), decoder = new globalThis.TextDecoder(); let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read(); assert(!done); buffer += decoder.decode(value, { stream: true });
      let split;
      while ((split = buffer.indexOf('\n\n')) >= 0) {
        const frame = JSON.parse(buffer.slice(0, split).match(/data: (.+)/)[1]); buffer = buffer.slice(split + 2);
        if (['completed', 'failed', 'cancelled'].includes(frame.snapshot.sources[0].run.status)) return frame;
      }
    }
  } finally { await reader.cancel(); }
}
function assertCompleted(frame) {
  assert.equal(frame.snapshot.sources[0].run.status, 'completed');
  const events = frame.execution.events, outputs = events.filter(event => event.channelId === 'output:cards' && event.kind === 'sent');
  assert.equal(events.length, 36); assert.equal(outputs.length, 3);
  assert.equal(new Set(outputs.map(event => event.packetId)).size, 3);
  for (const event of outputs) {
    const name = event.jobId.replace('pokemon-', '');
    assert.equal(event.payload.stats.name, name); assert.equal(event.payload.species.name, name);
    assert.equal(event.payload.stats.weight, 60); assert.equal(event.parentPacketIds.length, 2);
    const parents = event.parentPacketIds.map(id => events.find(item => item.packetId === id));
    assert(parents.every(parent => parent.jobId === event.jobId));
    assert.deepEqual(parents.map(parent => parent.channelId), ['edge:2', 'edge:3']);
  }
  assert(frame.snapshot.sources[0].run.channels.every(channel => channel.sent === 3 && channel.received === 3 && channel.queued === 0));
}

test('real HTTP branches collate correctly under bounded concurrent production runs', { timeout: 60000 }, async () => {
  const started = performance.now(), baseline = upstream.stats().calls, latencies = [];
  let next = 0;
  const runs = new Set(), packets = new Set();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next++ < 32) {
      const begin = performance.now(), frame = await completedRun(); assertCompleted(frame); latencies.push(performance.now() - begin);
      runs.add(frame.execution.runId);
      for (const event of frame.execution.events.filter(event => event.channelId === 'output:cards' && event.kind === 'sent')) packets.add(event.packetId);
    }
  }));
  await upstream.idle(); assert.equal(runs.size, 32); assert.equal(packets.size, 96);
  assert.equal(upstream.stats().calls - baseline, 192); assert(upstream.stats().peak >= 2 && upstream.stats().peak <= 16);
  latencies.sort((a, b) => a - b);
  const result = { runs: 32, jobs: 96, requests: 192, workers: 8, elapsedMs: performance.now() - started,
    medianRunMs: latencies[16], p95RunMs: latencies[30], ...upstream.stats(), node: process.version };
  writeFileSync(join(evidence, 'http-stress.json'), JSON.stringify(result, null, 2)); console.log('HTTP stress:', JSON.stringify(result));
});

test('provider errors refuse the flow without outputs or automatic retries', async () => {
  for (const mode of ['error', 'schema', 'malformed', 'oversize', 'disconnect', 'mismatch']) {
    upstream.mode(mode); const before = upstream.stats().calls;
    const frame = await completedRun(); assert.equal(frame.snapshot.sources[0].run.status, 'failed');
    assert.equal(frame.snapshot.sources[0].run.diagnostics.at(-1).code, 'COMPONENT_FAILED');
    assert(!frame.execution.events.some(event => event.channelId === 'output:cards'));
    await upstream.idle(); assert(upstream.stats().calls - before <= 2);
  }
  upstream.mode('success');
});

test('held real HTTP calls respect node timeout and disconnect cancellation', { timeout: 20000 }, async () => {
  upstream.mode('hold');
  const pending = completedRun(); await upstream.entered();
  const frame = await pending; assert(!frame.execution.events.some(event => event.channelId === 'output:cards')); assert.equal(frame.snapshot.sources[0].run.diagnostics.at(-1).code, 'NODE_TIMEOUT');
  await upstream.idle(); const before = upstream.stats().cancelled;
  const response = await globalThis.fetch(server.url + '/api/inspection?example=pokemon');
  await upstream.entered(); await response.body.cancel(); await upstream.idle();
  assert(upstream.stats().cancelled >= before + 2);
  upstream.release(); upstream.mode('success'); assertCompleted(await completedRun());
});

test('live browser shows real graph, collated cards, capture off and return to offline default', async () => {
  const browser = await createRequire(join(app, 'package.json'))('playwright').chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new globalThis.URL(route.request().url()).hostname) ? route.continue() : route.abort());
  try {
    const before = upstream.stats().calls;
    await page.goto(server.url + '/');
    await page.getByRole('link', { name: 'Open the live Pokémon demo', exact: true }).click();
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    assert.equal(upstream.stats().calls, before, 'home navigation does not trigger public work');
    await page.getByRole('button', { name: 'Run live Pokémon example (capture public results)', exact: true }).click();
    await page.getByRole('region', { name: 'Pokémon results' }).getByRole('heading', { name: 'charmander', exact: true }).waitFor();
    assert((await page.getByRole('img').textContent()).includes('Fetch Pokémon stats'));
    const graph = page.getByRole('img');
    const statsX = await graph.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).locator('rect').getAttribute('x');
    const speciesX = await graph.getByRole('button', { name: 'Inspect Fetch Pokémon species', exact: true }).locator('rect').getAttribute('x');
    assert.equal(statsX, speciesX, 'parallel nodes share a column');
    await page.screenshot({ path: join(evidence, 'pokemon-inspector.png'), fullPage: true });
    const results = page.getByRole('region', { name: 'Pokémon results', exact: true });
    assert.equal(await results.count(), 1);
    const beforeBrowse = upstream.stats().calls;
    await results.getByLabel('Output stage').selectOption('stats');
    assert((await results.locator('pre').first().textContent()).includes('weight'));
    assert(!(await results.locator('pre').first().textContent()).includes('genus'));
    await results.getByLabel('Output stage').selectOption('species');
    assert((await results.locator('pre').first().textContent()).includes('genus'));
    await results.getByLabel('Output stage').selectOption('split');
    assert.equal(await results.locator('article').count(), 6);
    await results.getByLabel('Output stage').selectOption('final');
    assert.equal(await results.locator('article').count(), 3);
    assert.equal(upstream.stats().calls, beforeBrowse);
    assert.equal(await results.locator('pre').first().evaluate(element => element.ownerDocument.defaultView.getComputedStyle(element).overflowY), 'auto');
    const statsNode = graph.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true });
    await statsNode.focus(); await statsNode.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Fetch Pokémon stats', exact: true });
    const job = modal.getByRole('region', { name: 'Job pokemon-pikachu', exact: true });
    const values = await job.locator('pre').allTextContents();
    assert.equal(JSON.parse(values[0]), 'pikachu'); assert.equal(JSON.parse(values[1]).name, 'pikachu');
    assert.equal(JSON.parse(values[1]).weight, 60); assert.equal(await modal.getByRole('region').count(), 3);
    assert(!(await job.textContent()).includes('genus'));
    await page.screenshot({ path: join(evidence, 'node-details.png') });
    await page.keyboard.press('Escape');
    assert.equal(await statsNode.evaluate(node => node === node.ownerDocument.activeElement), true);
    await page.getByLabel('Capture sample payloads').uncheck();
    await page.getByText('Enable capture to inspect public results.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Run account example again', exact: true }).click();
    await page.getByRole('button', { name: 'Inspect Load account', exact: true }).waitFor();
    await page.getByRole('region', { name: 'Pokémon results', exact: true }).waitFor({ state: 'detached' });
    upstream.mode('error');
    await page.getByRole('button', { name: 'Run live Pokémon example (capture public results)', exact: true }).click();
    await page.getByText('Run: failed · Latest diagnostic: COMPONENT_FAILED', { exact: true }).waitFor();
    upstream.mode('success');
  } finally {
    const entries = (await page.coverage.stopJSCoverage()).filter(item => item.url.includes('/_next/static/')).map(item => ({ ...item, url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href }));
    writeFileSync(join(evidence, 'browser-http.json'), JSON.stringify({ result: entries })); await browser.close();
  }
});

test('provider admission, caching policy and identity checks remain explicit', async t => {
  const { pokemonBase, readStats, readSpecies } = await import(pathToFileURL(join(app, 'lib/pokemon-http.ts')));
  assert.equal(pokemonBase(''), 'https://pokeapi.co/api/v2/');
  assert.equal(pokemonBase('http://127.0.0.1:1234/'), 'http://127.0.0.1:1234/');
  for (const host of ['https://example.com/', 'http://localhost/', 'http://127.0.0.1/a', 'http://u:p@127.0.0.1/', 'http://127.0.0.1/?x=1', 'http://127.0.0.1/#x']) {
    assert.throws(() => pokemonBase(host), /Invalid Pokémon test host/);
  }
  let reply, options, address;
  t.mock.method(globalThis, 'fetch', async (url, settings) => { address = url; options = settings; return reply; });
  const signal = new globalThis.AbortController().signal;
  const json = value => new globalThis.Response(JSON.stringify(value));
  reply = json({ name: 'pikachu', height: 4, weight: 60, types: [{ type: { name: 'electric' } }] });
  assert.equal((await readStats('pikachu', signal)).name, 'pikachu');
  assert.equal(address, 'https://pokeapi.co/api/v2/pokemon/pikachu'); assert.equal(options.cache, 'force-cache');
  assert.equal(options.next.revalidate, 3600); assert.equal(options.redirect, 'error'); assert.equal(options.signal, signal);
  reply = new globalThis.Response(null); await assert.rejects(readStats('pikachu', signal), /Empty/);
  reply = json({ name: 'other', height: 4, weight: 60, types: [] }); await assert.rejects(readStats('pikachu', signal), /identity mismatch/);
  reply = json({ name: 'other', genera: [] }); await assert.rejects(readSpecies('pikachu', signal), /identity mismatch/);
  reply = json({ name: 'pikachu', genera: [{ genus: 'Souris', language: { name: 'fr' } }] });
  assert.equal((await readSpecies('pikachu', signal)).genus, 'Unknown genus');
  reply = new globalThis.Response(null, { status: 503 }); await assert.rejects(readStats('pikachu', signal), /HTTP 503/);
});


test('invalid fixed live graph refuses before any provider call', async () => {
  const { startServer } = await import('../../scripts/next/server.mjs');
  const bad = await startServer(app, { badInspection: true, pokemonBase: upstream.url, coverage: join(evidence, 'v8-server') });
  const before = upstream.stats().calls;
  try {
    const response = await globalThis.fetch(bad.url + '/api/inspection?example=pokemon');
    assert.equal(response.status, 500); await response.text(); assert.equal(upstream.stats().calls, before);
  } finally { await bad.stop(); }
});
