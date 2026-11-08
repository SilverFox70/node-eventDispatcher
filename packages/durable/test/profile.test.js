import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileGraph, contract, defineComponent, defineConfiguredFunction, defineFunction, FlowError, packet } from 'event-driven-design';
import { runGraph } from 'event-driven-design/testing';
import { z } from 'zod';
import { prepareDurableProfile, resumeDurableProfile } from '../dist/index.js';
import { readDurableProfilePin } from '../dist/model/index.js';

const numeric = contract('durable-number@1', z.number());
const configuration = contract('durable-config@1', z.strictObject({ delta: z.number() }));
const fields = { id: 'adjust', version: 1, title: 'Adjust', description: '' };
const implementationDigest = 'a'.repeat(64);
const binding = { component: 'adjust@1', implementationDigest, contractsDigest: 'b'.repeat(64) };
const adapter = { component: binding.component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure' };
const config = { delta: 3 };
const retry = { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true };
const invokeOptions = { timeoutMs: 2000 };
const endpoint = port => ({ node: 'step', port });

function options(component, nodeOptions = {}) {
  return {
    graph: { version: 2, nodes: [{ id: 'step', component: binding.component, ...nodeOptions }],
      edges: [], inputs: { in: endpoint('in') }, outputs: { out: endpoint('out') } },
    registry: { [binding.component]: component }, adapters: [adapter],
    identity: { bindings: [binding], runtimeVersion: 'core@1', policyVersion: 'policy@1', serviceProfileDigest: 'c'.repeat(64) },
  };
}

function configured(handler) {
  return defineConfiguredFunction({ ...fields, input: numeric, output: numeric, configuration, handler });
}

function memory(profile, input) {
  const compiled = compileGraph(profile.graph, profile.registry);
  assert(compiled.ok);
  return runGraph(compiled.graph, { inputs: { in: [input] }, decisionEvidence: true, ...invokeOptions });
}

test('pure configured work shares output, lineage, validation and retry accounting', async () => {
  const component = configured((value, settings, context) => {
    if (context.attempt === 1) throw new FlowError('TEMPORARY');
    return value < 0 ? 'invalid' : value + settings.delta;
  });
  const candidate = options(component, { config, retry, taskTimeoutMs: 500 });
  const profile = prepareDurableProfile(candidate);
  const input = packet(4, { jobId: 'durable-job', key: 'task' });
  const inMemory = await memory(candidate, input);
  const computed = await profile.invoke('step', input, invokeOptions);
  assert.equal(computed.status, 'computed');
  const comparable = ({ value, jobId, key, parentPacketIds }) => ({ value, jobId, key, parentPacketIds });
  assert.deepEqual(comparable(computed.packet), comparable(inMemory.outputs.out[0]));
  assert.deepEqual(comparable(computed.packet), { value: 7, jobId: 'durable-job', key: 'task', parentPacketIds: [input.packetId] });
  assert.notEqual(computed.packet.packetId, inMemory.outputs.out[0].packetId);
  const memoryAttempts = inMemory.diagnostics.events.filter(event => event.kind === 'attempt-started');
  assert.equal(computed.attemptIds.length, memoryAttempts.length);
  assert.equal(new Set(computed.attemptIds).size, 2);
  const replay = await resumeDurableProfile(JSON.parse(JSON.stringify(profile.pin)), candidate).invoke('step', input, invokeOptions);
  assert.equal(replay.status, 'computed');
  assert.deepEqual(comparable(replay.packet), comparable(computed.packet));
  assert.notEqual(replay.packet.packetId, computed.packet.packetId);
  assert.notEqual(replay.runId, computed.runId);
  assert(replay.attemptIds.every(id => !computed.attemptIds.includes(id)));

  const wrongOutput = packet(-1);
  const stopped = await profile.invoke('step', wrongOutput, invokeOptions);
  assert.equal(stopped.status, 'stopped');
  assert.deepEqual(stopped.terminal, (await memory(candidate, wrongOutput)).terminal);
  assert.equal(stopped.terminal.code, 'OUTPUT_CONTRACT');
  assert.equal(stopped.attemptIds.length, 2);
  await assert.rejects(profile.invoke('step', packet('wrong'), invokeOptions), { code: 'INPUT_CONTRACT' });
  await assert.rejects(memory(candidate, packet('wrong')), { code: 'INPUT_CONTRACT' });
});

test('pure is an explicit adapter declaration and grants zero default retries', async () => {
  let entered = 0;
  const ordinary = defineComponent({ ...fields, in: { in: numeric }, out: { out: numeric },
    create: () => { entered++; return async () => {}; },
  });
  assert.throws(() => prepareDurableProfile(options(ordinary)), { code: 'PROFILE_INELIGIBLE' });
  assert.equal(entered, 0);
  const pure = defineFunction({ ...fields, input: numeric, output: numeric, handler: () => {
    entered++;
    throw new FlowError('TEMPORARY');
  } });
  const candidate = options(pure);
  const result = await prepareDurableProfile(candidate).invoke('step', packet(1), invokeOptions);
  assert.equal(result.status, 'stopped');
  assert.equal(result.attemptIds.length, 1);
  assert.equal(entered, 1);
  for (const adapters of [[], null, [null], [{ ...adapter, replayPolicy: 'provider-idempotent' }],
    [{ ...adapter, adapterVersion: 2 }], [{ ...adapter, component: 'other@1' }],
    [{ ...adapter, implementationDigest: 'd'.repeat(64) }], [{ ...adapter, extra: true }]]) {
    assert.throws(() => prepareDurableProfile({ ...candidate, adapters }), { code: 'PROFILE_INELIGIBLE' });
  }
  assert.throws(() => prepareDurableProfile({ ...candidate, graph: { ...candidate.graph, nodes: [] } }), { code: 'PROFILE_INELIGIBLE' });
  assert.throws(() => prepareDurableProfile({ ...candidate, identity: { ...candidate.identity, bindings: [] } }), { code: 'PROFILE_INELIGIBLE' });
  assert.equal(entered, 1);
});

test('resume refuses missing or changed code and contracts before invoking a replacement', () => {
  let entered = 0;
  const component = configured(value => value);
  const candidate = options(component, { config });
  const { pin } = prepareDurableProfile(candidate);
  const replaced = configured(value => { entered++; return value; });
  const replacementDigest = 'd'.repeat(64);
  const versioned = {
    ...candidate, registry: { [binding.component]: replaced },
    adapters: [{ ...adapter, implementationDigest: replacementDigest }],
    identity: { ...candidate.identity, bindings: [{ ...binding, implementationDigest: replacementDigest }] },
  };
  const contractChange = defineConfiguredFunction({
    ...fields, input: contract('durable-number@2', z.number()), output: numeric, configuration,
    handler: value => { entered++; return value; },
  });
  for (const unavailable of [versioned, { ...candidate, registry: {} },
    { ...candidate, registry: { [binding.component]: contractChange } },
    { ...candidate, identity: { ...candidate.identity, runtimeVersion: 'core@2' } },
    { ...candidate, adapters: [{ ...adapter, adapterVersion: 2 }] }]) {
    assert.throws(() => resumeDurableProfile(pin, unavailable), { code: 'VERSION_UNAVAILABLE' });
  }
  assert.throws(() => resumeDurableProfile({ ...pin, version: 2 }, candidate), { code: 'VERSION_UNAVAILABLE' });
  assert.equal(entered, 0);
  assert.deepEqual(readDurableProfilePin(pin), pin);
  for (const invalid of [null, { ...pin, format: 'other' }, { ...pin, executionDigest: 'bad' },
    { ...pin, adapterDigest: 'bad' }, { ...pin, extra: true }, { ...pin, extra: ' '.repeat(1024) }]) {
    assert.throws(() => readDurableProfilePin(invalid), /INVALID_PROFILE_PIN/);
  }
});
