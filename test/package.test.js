const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');

test('both distribution entries load', () => {
  // Exercise the checkout build as well as the isolated tarball consumer.
  for (const entry of ['index', 'model/index', 'testing/index']) require(`../dist/cjs/${entry}.js`);
  const fixture = mkdtempSync(join(tmpdir(), 'fbp-package-'));
  const run = (command, args, cwd = fixture) => {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  };
  try {
    const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', fixture, '--cache', join(fixture, 'npm-cache'), '--offline'], root))[0];
    const files = packed.files.map(file => file.path);
    for (const format of ['esm', 'cjs']) {
      for (const entry of ['index', 'model/index', 'testing/index']) {
        for (const extension of ['js', 'js.map', 'd.ts', 'd.ts.map']) {
          assert.ok(files.includes(`dist/${format}/${entry}.${extension}`));
        }
      }
    }
    assert.ok(files.includes('src/index.ts'));
    const installed = join(fixture, 'node_modules/event-driven-design');
    mkdirSync(installed, { recursive: true });
    run('tar', ['-xf', join(fixture, packed.filename), '--strip-components=1', '-C', installed]);
    writeFileSync(join(fixture, 'package.json'), '{"private":true}\n');
    for (const [mode, load] of [['commonjs', 'require'], ['module', 'await import']]) {
      const expression = ['event-driven-design', 'event-driven-design/model', 'event-driven-design/testing'].map(name => `${load}('${name}')`).join(';');
      run(process.execPath, ['--input-type=' + mode, '-e', expression]);
    }
    run(process.execPath, ['--input-type=module', '-e', `
      import { createDispatcher, packet, derivePacket } from 'event-driven-design';
      const dispatcher = createDispatcher();
      let count = 0;
      dispatcher.once('x', () => count++);
      dispatcher.emit('x'); dispatcher.emit('x');
      if (count !== 1) throw new Error('ESM once delivery failed');
      const parent = packet(2, { jobId: 'job-42' });
      if (derivePacket(4, [parent]).parentPacketIds[0] !== parent.packetId) throw new Error('ESM packet lineage failed');
      const dispose = dispatcher.declarePublisher('producer', 'x');
      if (dispatcher.inspect().publishers[0].provenance !== 'declared') throw new Error('ESM publisher missing');
      dispose();
    `]);
    for (const file of ['entries.mts', 'entries.cts', 'tsconfig.json']) cpSync(join(root, 'test/types', file), join(fixture, file));
    run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(fixture, 'tsconfig.json')]);
    assert.ok(existsSync(join(installed, 'server/src/eventDispatcher.js')));
    run(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const root = require('event-driven-design');
      const shim = require('event-driven-design/server/src/eventDispatcher.js');
      assert.equal(root.eventDispatcher, shim.eventDispatcher);
      const parent = root.packet(2, { jobId: 'job-42' });
      assert.equal(root.derivePacket(4, [parent]).parentPacketIds[0], parent.packetId);
      assert.equal(root.createChannel, undefined);
      const dispatcher = root.createDispatcher();
      let count = 0;
      dispatcher.once('x', () => count++);
      dispatcher.emit('x'); dispatcher.emit('x');
      assert.equal(count, 1);
      dispatcher.on('owned', () => {}, { ownerId: 'owner' });
      assert.equal(dispatcher.inspect().subscribers[0].ownerId, 'owner');
    `]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
