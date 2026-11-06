import { createHash } from 'node:crypto';
import { snapshotJsonMetadata, metadataRecord, metadataArray } from '../../model/contracts.js';
import type { Json } from '../../packet.js';
import { ensure, keys, name } from '../../model/diagnostics/packet.js';
import { digestPattern } from '../../model/diagnostics/causal/evidence.js';
import type { ExecutionIdentity } from '../../model/diagnostics/causal/evidence.js';
import type { GraphSpec } from '../../model/graph.js';
import { assertGraphShape } from '../../model/graph/structure.js';

export type BuildManifest = Readonly<{
  version: 1; files: readonly Readonly<{ path: string; sha256: string }>[];
  lockDigest: string; toolchain: Readonly<{ node: string; compiler: string }>;
  dependencyRoles: readonly Readonly<{ role: string; implementationDigest: string; fixtureProfileDigest: string }>[];
}>;
export type ExecutionIdentityInput = Readonly<{
  graph: GraphSpec;
  bindings: readonly Readonly<{ component: string; implementationDigest: string; contractsDigest: string }>[];
  runtimeVersion: string; policyVersion: string; serviceProfileDigest: string;
}>;

function canonical(value: Json): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key]!)).join(',') + '}';
}
export const hashEvidence = (value: Json) => createHash('sha256').update(canonical(value)).digest('hex');
const isDigest = (value: unknown) => typeof value === 'string' && digestPattern.test(value);
const isPath = (value: unknown): value is string => typeof value === 'string' && value.length <= 1024 &&
  !/[:\\\x00-\x1f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');
const unverified: ExecutionIdentity = Object.freeze({ status: 'unverified' });

/** The host supplies its declared closure independently of the hashed emitted files. */
export function implementationIdentity(manifest: BuildManifest, requiredFiles: readonly string[]): ExecutionIdentity {
  try {
    const copied = snapshotJsonMetadata(manifest);
    const fields = metadataRecord(copied);
    keys(fields, ['version', 'files', 'lockDigest', 'toolchain', 'dependencyRoles']);
    const files = metadataArray(fields.files), toolchain = metadataRecord(fields.toolchain);
    keys(toolchain, ['node', 'compiler']);
    ensure(fields.version === 1 && isDigest(fields.lockDigest) && name(toolchain.node) && name(toolchain.compiler));
    const expected = metadataArray(requiredFiles);
    ensure(files.length > 0 && files.length <= 4096 && files.length === expected.length && expected.every(isPath));
    const sorted = [...expected].sort();
    for (const [index, file] of files.entries()) {
      const row = metadataRecord(file);
      keys(row, ['path', 'sha256']);
      ensure(row.path === sorted[index] && sorted[index] !== sorted[index - 1] && isDigest(row.sha256));
    }
    const roles = metadataArray(fields.dependencyRoles), seen = new Set<string>();
    ensure(roles.length <= 256);
    for (const role of roles) {
      const row = metadataRecord(role);
      keys(row, ['role', 'implementationDigest', 'fixtureProfileDigest']);
      ensure(typeof row.role === 'string' && name(row.role) && !seen.has(row.role) &&
        isDigest(row.implementationDigest) && isDigest(row.fixtureProfileDigest));
      seen.add(row.role);
    }
    return Object.freeze({ status: 'verified', digest: hashEvidence({ format: 'nodeflow.implementation', version: 1, manifest: copied }) });
  } catch { return unverified; }
}

export function executionIdentity(value: ExecutionIdentityInput): ExecutionIdentity {
  try {
    const copied = snapshotJsonMetadata(value);
    const fields = metadataRecord(copied);
    keys(fields, ['graph', 'bindings', 'runtimeVersion', 'policyVersion', 'serviceProfileDigest']);
    assertGraphShape(fields.graph);
    const bindings = metadataArray(fields.bindings).map(metadataRecord);
    const expected = new Set(fields.graph.nodes.map(node => node.component));
    ensure(bindings.length === expected.size && name(fields.runtimeVersion) && name(fields.policyVersion) && isDigest(fields.serviceProfileDigest));
    for (const row of bindings) {
      keys(row, ['component', 'implementationDigest', 'contractsDigest']);
      ensure(typeof row.component === 'string' && expected.delete(row.component) &&
        isDigest(row.implementationDigest) && isDigest(row.contractsDigest));
    }
    bindings.sort((a, b) => a.component === b.component ? 0 : String(a.component) < String(b.component) ? -1 : 1);
    const preimage = snapshotJsonMetadata({ ...fields, bindings, format: 'nodeflow.execution', version: 1 });
    return Object.freeze({ status: 'verified', digest: hashEvidence(preimage) });
  } catch { return unverified; }
}
