const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, readdirSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`build coverage survives disposable worker ${signal}`, { skip: process.platform === 'win32' ? 'POSIX build-worker signals; hosted Next job runs Linux' : false }, async t => {
    const directory = mkdtempSync(join(tmpdir(), 'fbp-worker-coverage-'));
    const preload = pathToFileURL(resolve(__dirname, '../../scripts/next/coverage-exit.mjs')).href;
    const child = spawn(process.execPath, ['--import', preload, '-e',
      'function observedWork() { return 42; } console.log("ready", observedWork()); setInterval(() => {}, 1000);'], {
      env: { ...process.env, NODE_V8_COVERAGE: directory, NODE_OPTIONS: '' }, stdio: ['ignore', 'pipe', 'pipe']
    });
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
    const closed = new Promise(resolve => child.once('close', resolve));
    await new Promise((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => reject(Error('Worker startup timed out')), 5000);
      child.once('error', reject);
      child.stdout.once('data', data => { globalThis.clearTimeout(timeout); assert.match(data.toString(), /ready 42/); resolve(); });
    });
    child.kill(signal); await closed;
    const scripts = readdirSync(directory).filter(name => name.endsWith('.json')).flatMap(name => JSON.parse(readFileSync(join(directory, name), 'utf8')).result);
    assert(scripts.some(script => script.functions.some(fn => fn.functionName === 'observedWork' && fn.ranges[0].count > 0)),
      'Executed worker function must survive in V8 evidence, not only bootstrap modules');
  });
}


test('coverage preserves authored empty functions and unmapped executable code, excluding only unmapped empty stubs', async () => {
  const { mappedFunctions } = await import('../../scripts/next/coverage-ranges.mjs');
  const source = '()=>{};\n()=>{};()=>{work()}';
  const authored = { ranges: [{ startOffset: 0, endOffset: 6, count: 0 }] };
  const generated = { ranges: [{ startOffset: 8, endOffset: 14, count: 0 }] };
  const executable = { ranges: [{ startOffset: 15, endOffset: source.length, count: 0 }] };
  const map = { version: 3, sources: ['authored.ts'], names: [], mappings: 'AAAA' };
  assert.deepEqual(mappedFunctions([authored, generated, executable], source, map), [authored, executable]);
  assert.deepEqual(mappedFunctions([generated], source, { ...map, mappings: ';AAAA' }), [generated]);
});

test('coverage keeps cross-file locations and unexecuted authored functions exact', async () => {
  const { prepareCoverage, mappedFunctions } = await import('../../scripts/next/coverage-ranges.mjs');
  const { encode } = require('@jridgewell/sourcemap-codec');
  const convert = require('v8-to-istanbul');
  const source = 'function blocked(){return 1;}function good(){return 2;}';
  const split = source.indexOf('function good');
  const a = resolve('/tmp/fbp-map-a.ts'), b = resolve('/tmp/fbp-map-b.ts');
  const map = { version: 3, sources: [a, b], names: [], sourcesContent: [
    '\n'.repeat(49) + source.slice(0, split), '\n' + source.slice(split)
  ], mappings: encode([[[0, 0, 49, 0], [split - 1, 0, 49, split - 1],
    [split, 1, 1, 0], [source.length - 1, 1, 1, source.length - split - 1]]]) };
  const functions = [
    { functionName: 'blocked', isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: split, count: 0 }] },
    { functionName: 'good', isBlockCoverage: true, ranges: [{ startOffset: split, endOffset: source.length, count: 1 }] }
  ];
  const prepared = prepareCoverage(functions, source, map);
  const converter = convert('/tmp/fbp-generated.js', 0, { source: prepared.source, sourceMap: { sourcemap: prepared.map } }, path => ![a, b].includes(path));
  await converter.load(); converter.applyCoverage(mappedFunctions(prepared.functions, prepared.source, prepared.map));
  const report = converter.toIstanbul();
  const count = (file, name) => Object.entries(report[file].fnMap).find(([, fn]) => fn.name === name)?.[0];
  assert.equal(report[a].f[count(a, 'blocked')], 0, 'Unexecuted authored function must stay uncovered');
  assert.equal(report[b].f[count(b, 'good')], 1, 'Earlier source line in another file must not be reassigned');
  for (const text of ['x\ny', 'x\r\ny']) {
    const second = text.indexOf('y');
    const sample = prepareCoverage([{ ranges: [{ startOffset: 0, endOffset: 1, count: 1 }, { startOffset: second, endOffset: second + 1, count: 0 }] }], text,
      { ...map, mappings: 'AAAA;ACCA' });
    assert.equal(sample.source, ' x' + text.slice(1, second) + ' y');
    assert.deepEqual(sample.functions[0].ranges, [{ startOffset: 1, endOffset: 2, count: 1 },
      { startOffset: second + 2, endOffset: second + 3, count: 0 }]);
  }
});
