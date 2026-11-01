const { test } = require('node:test');
const { assert, component, single, collect, echo, packet, startNetwork } = require('./runtime-fixture.cjs');
const { createChannel } = require('../dist/cjs/channel.js');
const { jsonContract } = require('../dist/cjs');
const { validateExecutionTrace } = require('../dist/cjs/model');
const tick = () => new Promise(resolve => globalThis.queueMicrotask(resolve));

async function execute(options, values = [packet(2)], node = component('trace-echo', echo)) {
  const run = startNetwork(single(node), options);
  const outputs = collect(run.outputs.out);
  for (const value of values) await run.send('in', value);
  await run.finish(); await outputs;
  return run;
}

test('optional trace reports real transfers without retaining payloads by default', async () => {
  const disabled = await execute({});
  assert.equal(disabled.trace(), null); disabled.clearTrace();
  disabled.onTrace(() => assert.fail('disabled notification'))();
  assert.throws(() => disabled.onTrace(42), TypeError);
  const root = packet(2, { jobId: 'business-request' });
  const run = await execute({ trace: {} }, [root]);
  const trace = run.trace();
  assert.deepEqual(trace.events.map(event => [event.kind, event.channelId]), [
    ['sent', 'input:in'], ['received', 'input:in'], ['sent', 'output:out'], ['received', 'output:out']
  ]);
  assert(trace.events.every(event => event.packetId === root.packetId && event.jobId === root.jobId));
  assert(trace.events.every(event => event.payloadState === 'omitted' && !Object.hasOwn(event, 'payload')));
  assert.equal(trace.runId, run.runId); assert.equal(trace.dropped, 0); assert.equal(trace.total, 4);
  assert(validateExecutionTrace(trace).ok);
  assert(Object.isFrozen(trace.events[0].to)); assert(Object.isFrozen(trace.events[0].parentPacketIds));
  assert.throws(() => trace.events.push({}), TypeError);
  const another = await execute({ trace: { limit: 2, payloads: true } });
  assert.notEqual(another.trace().runId, trace.runId);
  assert.deepEqual(another.trace().events.map(event => event.sequence), [3, 4]);
  assert.equal(another.trace().dropped, 2); assert.equal(another.trace().events[0].payload, 2);
  const large = await execute({ trace: { payloads: true } }, [packet('🔷'.repeat(600))], component('json-echo', echo, { in: jsonContract }, { out: jsonContract }));
  const value = packet({ safe: { value: 1 } });
  const captured = await execute({ trace: { payloads: true } }, [value], component('json-copy', echo, { in: jsonContract }, { out: jsonContract }));
  const copy = captured.trace().events[0].payload;
  assert.notEqual(copy, value.value); assert(Object.isFrozen(copy.safe));
  assert(large.trace().events.every(event => event.payloadState === 'oversize' && !Object.hasOwn(event, 'payload')));
});

test('trace observers coalesce, isolate errors, dispose and clear without resetting execution protection', async () => {
  const run = startNetwork(single(component('trace-echo', echo)), { trace: { limit: 8 } });
  const outputs = collect(run.outputs.out); const root = packet(4);
  let observed = 0, failed = 0;
  const stop = run.onTrace(() => observed++);
  run.onTrace(() => { failed++; throw Error('observer'); });
  await run.send('in', root); await tick();
  assert(observed > 0); assert.equal(failed, 1);
  const previous = run.trace();
  run.clearTrace(); assert.equal(run.trace().events.length, 0); assert(previous.events.length > 0);
  assert.equal(run.trace().total, run.trace().dropped);
  await assert.rejects(run.send('in', root), { code: 'DUPLICATE_PACKET' });
  await run.finish(); await outputs; await tick();
  const count = observed; stop(); stop(); run.clearTrace(); await tick(); assert.equal(observed, count);
  const disposers = Array.from({ length: 64 }, () => run.onTrace(() => {}));
  assert.throws(() => run.onTrace(() => {}), RangeError); disposers.forEach(dispose => dispose());
  assert.throws(() => run.onTrace(null), TypeError);
});

test('trace option refusal happens before factories; invalid admission and cancelled parked sends are not sent', async () => {
  let factories = 0;
  const graph = single(component('unused', () => { factories++; return echo; }));
  for (const trace of [undefined, null, [], 1, { extra: 1 }, { limit: 0 }, { limit: 1025 }, { limit: 1.5 }, { payloads: 1 }]) {
    assert.throws(() => startNetwork(graph, { trace }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(factories, 0);
  const run = startNetwork(single(component('trace-echo', echo)), { trace: {} });
  const outputs = collect(run.outputs.out);
  await assert.rejects(run.send('in', packet('wrong-schema')), { code: 'INPUT_CONTRACT' });
  assert.equal(run.trace().total, 0);
  run.cancel(); await run.done; await assert.rejects(outputs);
  const events = [];
  const channel = createChannel(1, (kind, value) => events.push([kind, value]));
  await channel.send('one'); const pending = channel.send('two');
  assert.deepEqual(events, [['sent', 'one']]);
  await assert.rejects(channel.send('extra'), { code: 'CONCURRENT_SEND' });
  channel.abort(); await assert.rejects(pending); assert.deepEqual(events, [['sent', 'one']]);
});

test('channel observer covers direct handoff, queued reads, parked commit and throwing observers', async () => {
  const events = [], channel = createChannel(1, (kind, value) => events.push([kind, value]));
  const waiting = channel.receive(); await channel.send(1); await waiting;
  await channel.send(2); const pending = channel.send(3); await channel.receive(); await pending; await channel.receive();
  assert.deepEqual(events, [['sent', 1], ['received', 1], ['sent', 2], ['received', 2], ['sent', 3], ['received', 3]]);
  const broken = createChannel(1, () => { throw Error('observation'); });
  await broken.send(1); assert.equal((await broken.receive()).value, 1);
});
