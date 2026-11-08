const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('../../../test/package-fixture.cjs');

const { fixture, root, run, dispose } = installedPackage();
try {
  const [packed] = JSON.parse(run('npm', [
    'pack', './packages/durable', '--ignore-scripts', '--json', '--offline', '--pack-destination', fixture,
  ], root));
  run('npm', ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', './' + packed.filename]);
  const tests = readFileSync(join(root, 'packages/durable/test/profile.test.js'), 'utf8')
    .replace('../dist/index.js', 'event-driven-design-durable')
    .replace('../dist/model/index.js', 'event-driven-design-durable/model');
  writeFileSync(join(fixture, 'profile.test.mjs'), tests);
  assert.match(run(process.execPath, ['--test', '--test-reporter=tap', 'profile.test.mjs']), /^# pass 3$/m);

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
  `);
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--module', 'nodenext',
    '--strict', '--noEmit', 'durable-types.mts']);
  console.log('Installed durable profile, passive model, and TypeScript declarations passed.');
} finally { dispose(); }
