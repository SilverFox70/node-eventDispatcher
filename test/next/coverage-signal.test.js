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
