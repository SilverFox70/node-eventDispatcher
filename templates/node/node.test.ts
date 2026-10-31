import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGraph, compileGraph, startNetwork, packet } from 'event-driven-design';
import fixtures from './examples.json' with { type: 'json' };
import { makeLookupNode } from './node.js';

for (const fixture of fixtures) {
  test(fixture.title, async t => {
    const calls: { id: string; signal: AbortSignal }[] = [];
    const node = makeLookupNode({ lookup: async (id, { signal }) => {
      calls.push({ id, signal });
      return fixture.dependency;
    } });
    const graph = createGraph();
    const handle = graph.add('lookup', node);
    graph.exposeInput('in', handle, 'in');
    graph.exposeOutput('out', handle, 'out');
    const compiled = compileGraph(graph.toSpec(), { 'lookup-profile@1': node });
    assert(compiled.ok, JSON.stringify(compiled));
    const run = startNetwork(compiled.graph, { timeoutMs: 1000 });
    t.after(() => run.cancel());
    const output = (async () => {
      const packets = [];
      for await (const p of run.outputs.out!) packets.push(p);
      return packets;
    })();
    const input = packet(fixture.input, { jobId: 'profile-job', key: 'account@v1' });
    await run.send('in', input);
    assert.equal((await run.finish()).status, 'completed');
    const values = await output;
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.id, fixture.input.id);
    assert(calls[0]!.signal instanceof AbortSignal);
    assert.deepEqual(values.map(p => p.value), [fixture.output]);
    assert.equal(values[0]!.jobId, input.jobId);
    assert.equal(values[0]!.key, input.key);
    assert.notEqual(values[0]!.packetId, input.packetId);
    assert.deepEqual(values[0]!.parentPacketIds, [input.packetId]);
  });
}
