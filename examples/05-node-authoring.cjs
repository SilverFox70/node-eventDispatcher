const { pathToFileURL } = require('node:url');
const { setImmediate } = require('node:timers/promises');
const { buildTemplate } = require('../test/node-template-fixture.cjs');

async function main() {
  const fixture = buildTemplate();
  try {
    if (fixture.build.status !== 0) throw Error(fixture.build.stdout + fixture.build.stderr);
    const { makeLookupNode } = await import(pathToFileURL(fixture.module));
    const f = await import('../dist/esm/index.js');
    let calls = 0;
    const node = makeLookupNode({ lookup: async (id, { signal }) => {
      calls++;
      await setImmediate(undefined, { signal });
      return id === 'account-123' ? { label: 'Ada' } : null;
    } });
    const graph = f.createGraph();
    const handle = graph.add('lookup', node);
    graph.exposeInput('in', handle, 'in');
    graph.exposeOutput('out', handle, 'out');
    const registry = { 'lookup-profile@1': node };
    const compiled = f.compileGraph(graph.toSpec(), registry);
    if (!compiled.ok) throw Error(JSON.stringify(compiled.issues));
    const run = f.startNetwork(compiled.graph, { timeoutMs: 5000 });
    const consuming = (async () => {
      for await (const packet of run.outputs.out) console.log(JSON.stringify(packet.value));
    })();
    for (const id of ['account-123', 'missing']) {
      await run.send('in', f.packet({ id }, { jobId: 'authoring-demo', key: id }));
    }
    const terminal = await run.finish();
    await consuming;
    console.log('Lookup calls:', calls);
    console.log('Run:', terminal.status);
    console.log('Declared dependencies:', f.describeRegistry(registry).components[0].requiredDependencies.join(', '));
    if (terminal.status !== 'completed') throw Error(terminal.code);
  } finally {
    fixture.dispose();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
