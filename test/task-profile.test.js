const assert = require('node:assert/strict');
const { test } = require('node:test');
const { z } = require('zod');
const { compileGraph, contract, defineComponent, defineConfiguredFunction, packet } = require('../dist/cjs');
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
