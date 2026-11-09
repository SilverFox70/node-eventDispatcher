const assert = require('node:assert/strict');
const { copyFileSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('../../../test/package-fixture.cjs');

const { fixture, root, run, dispose } = installedPackage({ additionalPackages: ['packages/durable'] });
try {
  const tests = readFileSync(join(root, 'packages/durable/test/profile.test.js'), 'utf8')
    .replace('../dist/index.js', 'event-driven-design-durable')
    .replace('../dist/model/index.js', 'event-driven-design-durable/model');
  writeFileSync(join(fixture, 'profile.test.mjs'), tests);
  mkdirSync(join(fixture, 'fixtures'), { recursive: true });
  const routingProfile = readFileSync(join(root, 'packages/durable/test/fixtures/routing-profile.mjs'), 'utf8')
    .replace('../../dist/index.js', 'event-driven-design-durable');
  writeFileSync(join(fixture, 'fixtures/routing-profile.mjs'), routingProfile);
  assert.match(run(process.execPath, ['--test', '--test-reporter=tap', 'profile.test.mjs']), /^# pass 4$/m);

  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    const hook = registerHooks({
      resolve(specifier, context, next) {
        const result = next(specifier, context);
        assert(!result.url.startsWith('node:'), result.url);
        assert(!/\\/(?:runtime|testing|postgres)(?:[./])/.test(result.url), result.url);
        return result;
      },
    });
    await import('event-driven-design-durable/model');
    hook.deregister();
  `]);
  writeFileSync(join(fixture, 'durable-types.mts'), `
    import { defineConfiguredFunction, contract, packet } from 'event-driven-design';
    import { z } from 'zod';
    import { prepareDurableProfile, resumeDurableProfile, type DurableProfileOptions } from 'event-driven-design-durable';
    import { readDurableProfilePin } from 'event-driven-design-durable/model';
    import { openPostgresStore } from 'event-driven-design-durable/postgres';
    const numeric = contract('number@1', z.number());
    const configuration = contract('settings@1', z.strictObject({ multiplier: z.number() }));
    export const component = defineConfiguredFunction({
      id: 'times', version: 1, title: 'Times', description: '', input: numeric, output: numeric, configuration,
      handler: (value, config) => value * config.multiplier,
    });
    declare const options: DurableProfileOptions;
    const profile = prepareDurableProfile(options);
    const reopened = resumeDurableProfile(readDurableProfilePin(profile.pin), options);
    const outcome = await reopened.invoke('times', packet(5), { timeoutMs: 1000 });
    if (outcome.status === 'computed') outcome.packet.parentPacketIds satisfies readonly string[];
    declare const url: string;
    const store = openPostgresStore(url);
    const scope = { workspaceId: 'workspace', runId: 'id' };
    await store.initializeSteps(scope, profile);
    const [step] = await store.claimSteps(scope, profile, { workerId: 'worker', leaseMs: 1000, limit: 1 });
    if (step && outcome.status === 'computed') await store.commitStep(scope, profile, {
      stepId: step.stepId, epoch: step.epoch, workerId: 'worker', commitKey: 'commit', result: { kind: 'computed', packet: outcome.packet },
    });
    const target = await store.getReconciliationTarget(scope, 'step', 'operation');
    await store.reconcileExternalOperation(scope, profile, {
      operationId: target.binding.operationId, stepId: 'step', commandKey: 'review',
      actorId: 'operator', mode: 'manual', expectedRevision: target.revision,
    }, {
      provider: target.binding.provider, policyVersion: target.binding.policyVersion, authorize: () => true,
      async readEvidence(binding) { return { binding, kind: 'succeeded', evidenceRef: 'receipt', value: 5 }; },
    });
    await store.withDurableTransaction('workspace', async tx => {
      await tx.query<{ revision: number }>('SELECT revision FROM person');
      await tx.stage({ jobId: 'job', revisionId: 'rev', profilePin: profile.pin, inputs: {} });
    });
  `);
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--module', 'nodenext',
    '--strict', '--noEmit', 'durable-types.mts']);
  const postgresUrl = process.env.FBP_POSTGRES_TEST_URL;
  if (postgresUrl) {
    const integration = readFileSync(join(root, 'packages/durable/test/postgres.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres')
      .replace('../../../examples/durable/update-person.mjs', './update-person.mjs');
    copyFileSync(join(root, 'examples/durable/update-person.mjs'), join(fixture, 'update-person.mjs'));
    writeFileSync(join(fixture, 'postgres.test.mjs'), integration);
    const steps = readFileSync(join(root, 'packages/durable/test/steps.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres')
      .replace('../migrations/001-submissions.sql', './node_modules/event-driven-design-durable/migrations/001-submissions.sql');
    writeFileSync(join(fixture, 'steps.test.mjs'), steps);
    const leases = readFileSync(join(root, 'packages/durable/test/leases.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres')
      .replace('../dist/index.js', 'event-driven-design-durable');
    writeFileSync(join(fixture, 'leases.test.mjs'), leases);
    const operations = readFileSync(join(root, 'packages/durable/test/operations.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres');
    writeFileSync(join(fixture, 'operations.test.mjs'), operations);
    const reconciliation = readFileSync(join(root, 'packages/durable/test/reconciliation.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres');
    writeFileSync(join(fixture, 'reconciliation.test.mjs'), reconciliation);
    const timing = readFileSync(join(root, 'packages/durable/test/timing.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres')
      .replace('../dist/index.js', 'event-driven-design-durable');
    writeFileSync(join(fixture, 'timing.test.mjs'), timing);
    const routing = readFileSync(join(root, 'packages/durable/test/routing.test.js'), 'utf8')
      .replace('../dist/postgres/index.js', 'event-driven-design-durable/postgres')
      .replace('../dist/index.js', 'event-driven-design-durable');
    writeFileSync(join(fixture, 'routing.test.mjs'), routing);
    for (const file of ['step-profile.mjs', 'step-worker.mjs', 'lease-worker.mjs', 'external-worker.mjs', 'routing-profile.mjs', 'routing-worker.mjs']) {
      const contents = readFileSync(join(root, 'packages/durable/test/fixtures', file), 'utf8')
        .replace('../../dist/index.js', 'event-driven-design-durable')
        .replace('../../dist/postgres/index.js', 'event-driven-design-durable/postgres');
      writeFileSync(join(fixture, 'fixtures', file), contents);
    }
    assert.match(run(process.execPath, ['--test', '--test-reporter=tap', 'postgres.test.mjs', 'steps.test.mjs', 'leases.test.mjs', 'operations.test.mjs', 'reconciliation.test.mjs', 'timing.test.mjs', 'routing.test.mjs']), /^# pass 26$/m);
  }
  console.log('Installed durable profile, passive model, and TypeScript declarations passed.');
} finally { dispose(); }
