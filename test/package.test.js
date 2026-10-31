const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, cpSync, rmSync, existsSync } = require('node:fs');
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
    writeFileSync(join(fixture, 'package.json'), '{"private":true}\n');
    const cache = run('npm', ['config', 'get', 'cache'], root).trim();
    run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund',
      '--package-lock=false', '--cache', cache, join(fixture, packed.filename)]);
    for (const [mode, load] of [['commonjs', 'require'], ['module', 'await import']]) {
      const expression = ['event-driven-design', 'event-driven-design/model', 'event-driven-design/testing'].map(name => `${load}('${name}')`).join(';');
      run(process.execPath, ['--input-type=' + mode, '-e', expression]);
    }
    run(process.execPath, ['--input-type=module', '-e', `
      import { createDispatcher, packet, derivePacket, contract, defineComponent, describeRegistry, compileGraph, createGraph } from 'event-driven-design';
      import { z } from 'zod';
      const dispatcher = createDispatcher();
      let count = 0;
      dispatcher.once('x', () => count++);
      dispatcher.emit('x'); dispatcher.emit('x');
      if (count !== 1) throw new Error('ESM once delivery failed');
      const n = contract('n@1', z.number());
      const text = contract('text@1', z.string().min(1));
      const component = defineComponent({ id: 'node', version: 1, title: 'Node', description: '',
        in: { value: n }, out: { label: text }, create: () => async () => {} });
      if (describeRegistry({ 'node@1': component }).components.length !== 1) throw new Error('ESM catalog failed');
      const builder = createGraph(), handle = builder.add('node', component);
      builder.exposeInput('value', handle, 'value'); builder.exposeOutput('label', handle, 'label');
      const graph = builder.toSpec();
      if (!compileGraph(graph, { 'node@1': component }).ok) throw new Error('ESM compile failed');
      const { validateGraph } = await import('event-driven-design/model');
      if (!validateGraph(graph, describeRegistry({ 'node@1': component })).ok) throw new Error('ESM validate failed');
      const parent = packet(2, { jobId: 'job-42' });
      if (derivePacket(4, [parent]).parentPacketIds[0] !== parent.packetId) throw new Error('ESM packet lineage failed');
      const dispose = dispatcher.declarePublisher('producer', 'x');
      if (dispatcher.inspect().publishers[0].provenance !== 'declared') throw new Error('ESM publisher missing');
      dispose();
    `]);
    for (const mode of ['commonjs', 'module']) {
      const load = mode === 'commonjs' ? "const f = require('event-driven-design'); const { z } = require('zod');" : "import * as f from 'event-driven-design'; import { z } from 'zod';";
      const output = run(process.execPath, ['--input-type=' + mode, '-e', load + `
        (async () => {
          let attempts = 0;
          const node = f.defineComponent({ id: 'double', version: 1, title: 'Double', description: '',
            in: { in: f.jsonContract }, out: { out: f.jsonContract }, create: () => async ctx => {
              for await (const p of ctx.inputs.in) {
                const value = await ctx.task(({ attempt }) => { attempts++; if (attempt === 1) throw new f.FlowError('TEMPORARY'); return p.value * 2; });
                await ctx.send('out', f.derivePacket(value, [p]));
              }
            } });
          const builder = f.createGraph(), n = builder.add('n', node, { taskTimeoutMs: 1000, retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } });
          builder.exposeInput('in', n, 'in'); builder.exposeOutput('out', n, 'out');
          const graph = f.compileGraph(builder.toSpec(), { 'double@1': node }).graph;
          const network = f.startNetwork(graph, { timeoutMs: 1000 });
          const collected = (async () => { const values = []; for await (const p of network.outputs.out) values.push(p.value); return values; })();
          await network.send('in', f.packet(2));
          if ((await network.finish()).status !== 'completed') throw Error('Runtime did not complete');
          console.log('stream:' + (await collected).join(','));
          console.log('attempts:' + attempts);
          const slow = f.defineComponent({ id: 'slow', version: 1, title: 'Slow', description: '',
            in: {}, out: {}, create: () => async () => { await new Promise(() => {}); } });
          const slowGraph = f.compileGraph({ version: 1, nodes: [{ id: 's', component: 'slow@1' }],
            edges: [], inputs: {}, outputs: {} }, { 'slow@1': slow }).graph;
          const terminal = await f.startNetwork(slowGraph, { timeoutMs: 1 }).done;
          if (terminal.code !== 'TIMEOUT') throw Error('Deadline result missing');
          console.log('deadline:' + terminal.code);
          const local = f.defineComponent({ id: 'local', version: 1, title: 'Local', description: '', in: {}, out: {},
            create: () => async ctx => { await ctx.task(() => new Promise(() => {})); } });
          const localGraph = f.compileGraph({ version: 1, nodes: [{ id: 'local', component: 'local@1', taskTimeoutMs: 1 }],
            edges: [], inputs: {}, outputs: {} }, { 'local@1': local }).graph;
          const localTerminal = await f.startNetwork(localGraph, { timeoutMs: 1000 }).done;
          console.log('node-deadline:' + localTerminal.code);
          const numeric = f.contract('function-number@1', z.number()); let functionCalls = 0;
          const fn = f.defineFunction({ id: 'function', version: 1, title: 'Function', description: '', input: numeric, output: numeric,
            handler: (value, ctx) => { functionCalls++; if (ctx.packet.jobId !== 'function-job') throw Error('Metadata lost');
              if (ctx.attempt === 1) throw new f.FlowError('TEMPORARY'); return value * 2; } });
          const functions = f.createGraph(), fh = functions.add('fn', fn, { retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } });
          functions.exposeInput('in', fh, 'in'); functions.exposeOutput('out', fh, 'out');
          const fg = f.compileGraph(functions.toSpec(), { 'function@1': fn }).graph, fr = f.startNetwork(fg);
          const results = (async () => { const values = []; for await (const p of fr.outputs.out) values.push(p); return values; })();
          const fp = f.packet(2, { jobId: 'function-job' }); await fr.send('in', fp); await fr.finish();
          const fv = await results; if (fv.length !== 1 || fv[0].parentPacketIds[0] !== fp.packetId) throw Error('Function lineage lost');
          console.log('function:' + fv[0].value + ':' + functionCalls);
          const hung = f.defineFunction({ id: 'hung', version: 1, title: 'Hung', description: '', input: numeric, output: numeric,
            handler: () => new Promise(() => {}) });
          const hg = f.createGraph(), hh = hg.add('hung', hung, { taskTimeoutMs: 1 }); hg.exposeInput('in', hh, 'in'); hg.exposeOutput('out', hh, 'out');
          const hr = f.startNetwork(f.compileGraph(hg.toSpec(), { 'hung@1': hung }).graph, { timeoutMs: 1000 });
          await hr.send('in', f.packet(1)); console.log('function-timeout:' + (await hr.done).code);

        })().catch(error => { console.error(error); process.exitCode = 1; });
      `]);
      assert.equal(output.trim(), 'stream:4\nattempts:2\ndeadline:TIMEOUT\nnode-deadline:NODE_TIMEOUT\nfunction:4:2\nfunction-timeout:NODE_TIMEOUT');
    }
    for (const file of ['entries.mts', 'entries.cts', 'tsconfig.json']) cpSync(join(root, 'test/types', file), join(fixture, file));
    run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(fixture, 'tsconfig.json')]);
    assert.ok(existsSync(join(installed, 'server/src/eventDispatcher.js')));
    run(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const root = require('event-driven-design');
      const shim = require('event-driven-design/server/src/eventDispatcher.js');
      assert.equal(root.eventDispatcher, shim.eventDispatcher);
      const z = require('zod');
      const n = root.contract('n@1', z.number());
      const text = root.contract('text@1', z.string().min(1));
      const component = root.defineComponent({ id: 'node', version: 1, title: 'Node', description: '',
        in: { value: n }, out: { label: text }, create: () => async () => {} });
      assert.equal(root.describeRegistry({ 'node@1': component }).components.length, 1);
      const builder = root.createGraph(), handle = builder.add('node', component);
      builder.exposeInput('value', handle, 'value'); builder.exposeOutput('label', handle, 'label');
      const graph = builder.toSpec();
      assert.equal(root.compileGraph(graph, { 'node@1': component }).ok, true);
      assert.equal(require('event-driven-design/model').validateGraph(graph, root.describeRegistry({ 'node@1': component })).ok, true);
      assert.equal(root.getGraphDefinition, undefined);
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
