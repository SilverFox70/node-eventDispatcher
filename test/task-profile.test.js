const assert = require('node:assert/strict');
const { test } = require('node:test');
const { z } = require('zod');
const { compileGraph, contract, defineComponent, defineConfiguredFunction, FlowError, packet } = require('../dist/cjs');
const { prepareBoundedTasks } = require('../dist/cjs/runtime/task-profile');

const numeric = contract('profile-number@1', z.number());
const configuration = contract('profile-config@1', z.strictObject({ delta: z.number() }));
const fields = { id: 'profile', version: 1, title: 'Profile', description: '' };

function compiled(component, config) {
  const result = compileGraph({
    version: 2, nodes: [{ id: 'node', component: 'profile@1', ...config }], edges: [],
    inputs: { in: { node: 'node', port: 'in' } }, outputs: { out: { node: 'node', port: 'out' } },
  }, { 'profile@1': component });
  assert(result.ok);
  return result.graph;
}

test('shared finite invocation applies validated config and keeps runtime lineage', async () => {
  const definition = { ...fields, input: numeric, output: numeric, configuration,
    handler: (value, config, context) => {
      assert(Object.isFrozen(config));
      assert(context.recordDecision({ code: 'reviewed', ruleVersion: 'v1', outcome: 'keep', facts: [] }));
      return value < 0 ? 'invalid' : value + config.delta;
    },
    decisions: [{ code: 'reviewed', ruleVersion: 'v1', outcomes: ['keep'], facts: [] }],
  };
  const component = defineConfiguredFunction(definition);
  const { invoke } = prepareBoundedTasks(compiled(component, { config: { delta: 3 } }));
  const input = packet(2, { jobId: 'profile-job', key: 'key' });
  const computed = await invoke('node', input, { timeoutMs: 1000 });
  assert.equal(computed.status, 'computed');
  assert.equal(computed.packet.value, 5);
  assert.deepEqual(computed.packet.parentPacketIds, [input.packetId]);
  assert.equal(computed.packet.jobId, input.jobId);
  assert.equal(computed.attemptIds.length, 1);
  const stopped = await invoke('node', packet(-1), { timeoutMs: 1000 });
  assert.equal(stopped.status, 'stopped');
  assert.equal(stopped.terminal.code, 'OUTPUT_CONTRACT');
  await assert.rejects(invoke('missing', input, { timeoutMs: 1000 }), { code: 'UNKNOWN_TASK_NODE' });
  assert.throws(() => defineConfiguredFunction({ ...definition, handler: false }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => defineConfiguredFunction({ ...definition, configuration: null }), { code: 'INVALID_ARGUMENT' });
});

test('arbitrary streaming factories are never entered by the task profile', () => {
  let entered = 0;
  const streaming = defineComponent({ ...fields, in: { in: numeric }, out: { out: numeric },
    create: () => { entered++; return async () => {}; },
  });
  assert.throws(() => prepareBoundedTasks(compiled(streaming)), { code: 'PROFILE_INELIGIBLE' });
  assert.equal(entered, 0);
});


test('leased invocation consumes one attempt even when the graph permits retries', async () => {
  const component = defineConfiguredFunction({ ...fields, input: numeric, output: numeric, configuration,
    handler: (value, _config, context) => {
      if (context.attempt === 1) throw new FlowError('TEMPORARY');
      return value;
    },
  });
  const { invoke, invokeOnce } = prepareBoundedTasks(compiled(component, {
    config: { delta: 0 }, retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true },
  }));
  const input = packet(1);
  const one = await invokeOnce('node', input, { timeoutMs: 1000 });
  assert.equal(one.status, 'stopped');
  assert.equal(one.attemptIds.length, 1);
  assert.equal(one.retryCode, 'TEMPORARY');
  const retried = await invoke('node', input, { timeoutMs: 1000 });
  assert.equal(retried.status, 'computed');
  assert.equal(retried.attemptIds.length, 2);
});

test('bounded routing reuses the broadcast and merge factories with named ports', async () => {
  const { broadcast, merge } = require('../dist/cjs');
  const registry = { 'broadcast@1': broadcast(numeric, ['a', 'b']), 'merge@1': merge(numeric, ['a', 'b']) };
  const compiled = compileGraph({
    version: 1, nodes: [{ id: 'fork', component: 'broadcast@1' }, { id: 'merge', component: 'merge@1' }],
    edges: ['a', 'b'].map(port => ({ from: { node: 'fork', port }, to: { node: 'merge', port } })),
    inputs: { in: { node: 'fork', port: 'in' } }, outputs: { out: { node: 'merge', port: 'out' } },
  }, registry);
  assert(compiled.ok);
  assert.throws(() => prepareBoundedTasks(compiled.graph, new Map([['broadcast@1', 'merge']])), { code: 'PROFILE_INELIGIBLE' });
  const { invokeDelivery } = prepareBoundedTasks(compiled.graph, new Map([['broadcast@1', 'broadcast'], ['merge@1', 'merge']]));
  const input = packet(1);
  const fork = await invokeDelivery('fork', input, { timeoutMs: 1000 }, 'in');
  assert.equal(fork.status, 'computed');
  const merged = await invokeDelivery('merge', fork.outputs.b[0], { timeoutMs: 1000 }, 'b');
  assert.equal(merged.outputs.out[0].packetId, fork.outputs.b[0].packetId);
});

test('a keyed join is recognized but cannot run as a single-packet task', async () => {
  const { joinByKey } = require('../dist/cjs');
  const { joinPolicy } = require('../dist/cjs/runtime/task-profile.js');
  const component = joinByKey({ stats: numeric, species: numeric }, { outputId: 'result@1' });
  const ref = 'join-by-key@1';
  const { ok, graph } = compileGraph({ version: 1, nodes: [{ id: 'join', component: ref }], edges: [],
    inputs: { stats: { node: 'join', port: 'stats' }, species: { node: 'join', port: 'species' } },
    outputs: { out: { node: 'join', port: 'out' } },
  }, { [ref]: component });
  assert(ok);
  assert.deepEqual(joinPolicy(component).names, ['stats', 'species']);
  assert.equal(joinPolicy(numeric), undefined);
  const { invokeDelivery } = prepareBoundedTasks(graph, new Map([[ref, 'join-by-key']]));
  await assert.rejects(invokeDelivery('join', packet(1), { timeoutMs: 1000 }, 'stats'), { code: 'UNKNOWN_TASK_NODE' });
});

test('durable wait definition is branded, named and reserved for the durable host', async () => {
  const { durableWait, waitSignalName } = require('../dist/cjs/runtime/task-profile');
  const { runGraph } = require('../dist/cjs/testing');
  for (const invalid of [null, 'invalid name']) {
    assert.throws(() => durableWait(numeric, numeric, invalid), { code: 'INVALID_ARGUMENT' });
  }
  const component = durableWait(numeric, numeric, 'approved');
  const ref = 'durable-wait@1';
  const result = compileGraph({ version: 1, nodes: [{ id: 'wait', component: ref }], edges: [],
    inputs: { in: { node: 'wait', port: 'in' } }, outputs: { out: { node: 'wait', port: 'out' } },
  }, { [ref]: component });
  assert(result.ok);
  assert.equal(waitSignalName(component), 'approved');
  assert.equal(waitSignalName(numeric), undefined);
  const { invokeDelivery } = prepareBoundedTasks(result.graph, new Map([[ref, 'wait']]));
  await assert.rejects(invokeDelivery('wait', packet(1), { timeoutMs: 1000 }, 'in'), { code: 'UNKNOWN_TASK_NODE' });
  const inMemory = await runGraph(result.graph, { timeoutMs: 1000, inputs: { in: [packet(1)] } });
  assert.equal(inMemory.terminal.status, 'failed');
});
