import { contract, defineConfiguredComponent, derivePacket, describeRegistry } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { z } from 'zod';

export const hash = value => createHash('sha256').update(value).digest('hex');
const number = contract('adoption-number@1', z.number());
export const increase = defineConfiguredComponent({
  id: 'increase', version: 1, title: 'Increase', description: 'Add the configured amount.',
  configuration: contract('adoption-config@1', z.strictObject({ delta: z.number() })),
  in: { in: number }, out: { out: number },
  create: ({ delta }) => async ctx => {
    for await (const input of ctx.inputs.in) await ctx.send('out', derivePacket(input.value + delta, [input]));
  },
});

export const registry = { 'increase@1': increase };
export const catalog = describeRegistry(registry);
export const registryLock = {
  version: 1, policyVersion: 'adoption@1', representations: [],
  bindings: [{ component: 'increase@1', moduleBindingId: 'increase',
    implementationDigest: hash(readFileSync(new globalThis.URL(import.meta.url))),
    contractsDigest: hash(canonicalJson(catalog)) }],
};
export const executionBindings = registryLock.bindings.map(({ component, implementationDigest, contractsDigest }) =>
  ({ component, implementationDigest, contractsDigest }));
export const bindingManifest = {
  version: 1, bindings: [{ moduleBindingId: 'increase', specifier: 'fbp-adoption-demo/nodes', exportName: 'increase' }],
};
const runtimeManifest = findPackageJSON('event-driven-design', import.meta.url);
const { name, version } = JSON.parse(readFileSync(runtimeManifest, 'utf8'));
export const runtimeVersion = name + '@' + version;
export const serviceProfileHash = hash('offline-no-services');
export const scope = { workspaceId: 'adoption', documentId: 'increase' };
