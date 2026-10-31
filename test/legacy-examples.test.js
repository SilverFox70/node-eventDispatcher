const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { fileLoader } = require('../examples/legacy/fileLoader.cjs');
const { scan } = require('../examples/legacy/eventNodeMap.cjs');

test('scanner errors and side effect free import: native filesystem rejection and heuristic output', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fbp-scanner-'));
  try {
    writeFileSync(join(directory, 'node.js'), "events.on('x', handler);\nevents.once(\"y\", once);\nevents.emit('z');\nevents.on('empty');\nevents.emit('with-data', value);\n");
    writeFileSync(join(directory, 'ignore.txt'), 'ignore');
    assert.deepEqual(await fileLoader.getFileList(directory), ['node.js']);
    assert.deepEqual(await fileLoader.createFilesObject([], directory), []);
    const result = await scan(directory);
    assert.deepEqual(result, { files: [{ fileName: 'node.js', subscribedEvents: [
      { eventName: 'x', callback: 'handler', once: false, line: 1 },
      { eventName: 'y', callback: 'once', once: true, line: 2 },
      { eventName: 'empty', callback: '', once: false, line: 4 },
    ], invokedEvents: [{ eventName: 'z', data: '', line: 3 }, { eventName: 'with-data', data: 'value', line: 5 }] }] });
    for (const operation of [() => fileLoader.getFileList(join(directory, 'missing')), () => fileLoader.readFile('missing', directory), () => scan(join(directory, 'missing'))]) {
      await assert.rejects(operation(), { code: 'ENOENT' });
    }
    await fileLoader.readFile('fileLoader.cjs');
    assert.equal((await fileLoader.createFilesObject(['fileLoader.cjs'])).length, 1);
    const cli = spawnSync(process.execPath, ['examples/legacy/eventNodeMap.cjs', directory], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr); assert.deepEqual(JSON.parse(cli.stdout), result);
    const bad = spawnSync(process.execPath, ['examples/legacy/eventNodeMap.cjs', join(directory, 'missing')], { encoding: 'utf8' });
    assert.equal(bad.status, 1); assert.equal(bad.stderr.trim(), 'ENOENT');
    const defaults = spawnSync(process.execPath, ['examples/legacy/eventNodeMap.cjs'], { encoding: 'utf8' });
    assert.equal(defaults.status, 0, defaults.stderr); assert(JSON.parse(defaults.stdout).files.length > 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('scanner errors and side effect free import: core and legacy modules do no scanning/logging/HTTP', () => {
  const child = spawnSync(process.execPath, ['-e', `
    const assert=require('node:assert/strict'),fs=require('node:fs/promises');
    for(const method of ['readFile','readdir'])fs[method]=()=>{throw Error('unexpected scan')};
    globalThis.fetch=()=>{throw Error('unexpected HTTP')};console.log=()=>{throw Error('unexpected log')};
    const f=require('event-driven-design'), before=f.eventDispatcher.inspect();
    require('./examples/legacy/eventNodeMap.cjs');require('./examples/legacy/www.cjs');
    assert.deepEqual(f.eventDispatcher.inspect(),before);
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stdout + child.stderr);
});
