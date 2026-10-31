import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packet } from 'event-driven-design';
import { runNode } from 'event-driven-design/testing';
import fixtures from './examples.json' with { type: 'json' };
import { makeLookupNode } from './node.js';

for (const fixture of fixtures) {
  test(fixture.title, async () => {
    const calls: { id: string; signal: AbortSignal }[] = [];
    const node = makeLookupNode({ lookup: async (id, { signal }) => {
      calls.push({ id, signal });
      return fixture.dependency;
    } });
    const input = packet(fixture.input, { jobId: 'profile-job', key: 'account@v1' });
    const result = await runNode(node, { inputs: { in: [input] } });
    assert.equal(result.terminal.status, 'completed');
    const values = result.outputs.out;
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
