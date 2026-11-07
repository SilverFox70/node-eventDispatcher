import { componentIdentity, digest, fields, increasing, invalid, list, name } from './fields.js';

export type RegistryLock = Readonly<{
  version: 1;
  bindings: readonly Readonly<{
    component: string; implementationDigest: string; contractsDigest: string; moduleBindingId: string;
  }>[];
  representations: readonly Readonly<{ id: string; version: number }>[];
  policyVersion: string;
}>;

export function checkRegistry(value: unknown, components: ReadonlySet<string>) {
  const lock = fields(value, ['version', 'bindings', 'representations', 'policyVersion']);
  if (lock.version !== 1 || !name(lock.policyVersion)) invalid();
  const bindings = list(lock.bindings, 1000);
  if (bindings.length !== components.size) invalid();
  let previous = '';
  for (const binding of bindings) {
    const row = fields(binding, ['component', 'implementationDigest', 'contractsDigest', 'moduleBindingId']);
    if (!componentIdentity(row.component)) return invalid();
    previous = increasing(previous, row.component);
    if (!components.has(previous) || !digest(row.implementationDigest) ||
      !digest(row.contractsDigest) || !name(row.moduleBindingId)) invalid();
  }
  previous = '';
  for (const representation of list(lock.representations, 1000)) {
    const row = fields(representation, ['id', 'version']);
    if (!name(row.id)) return invalid();
    previous = increasing(previous, row.id);
    if (typeof row.version !== 'number' || !Number.isSafeInteger(row.version) || row.version < 1) invalid();
  }
}
