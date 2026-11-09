import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { contract, defineFunction, packet } from 'event-driven-design';
import { z } from 'zod';
import { prepareDurableProfile } from '../../dist/index.js';

const state = contract('qualification-state@1', z.strictObject({
  resource: z.string(), revision: z.number().int(), needsVerification: z.boolean(),
  verification: z.enum(['pending', 'verified', 'skipped']),
}));
const sync = defineFunction({ id: 'sync', version: 1, title: 'Sync', description: '',
  input: state, output: state, handler() { throw Error('Sync requires the provider permit'); } });
const verify = defineFunction({ id: 'verify', version: 1, title: 'Verify', description: '',
  input: state, output: state, handler: value => ({
    ...value, verification: value.needsVerification ? 'verified' : 'skipped',
  }) });
const project = defineFunction({ id: 'project', version: 1, title: 'Project', description: '',
  input: state, output: state, handler: value => value });
const registry = { 'sync@1': sync, 'verify@1': verify, 'project@1': project };
const nodes = ['sync', 'verify', 'project'].map(id => ({
  id, component: id + '@1', ...(id === 'sync' && { retry: {
    maxRetries: 2, codes: ['TEMPORARY'], delayMs: 0, idempotent: true,
  } }),
}));

const source = readFileSync(new globalThis.URL(import.meta.url));

export function domainProfile(changed = false) {
  const bindings = Object.keys(registry).map(component => ({
    component,
    implementationDigest: createHash('sha256').update(source).update(component).update(changed ? 'changed' : 'pinned').digest('hex'),
    contractsDigest: 'b'.repeat(64),
  }));
  return prepareDurableProfile({
    registry, graph: {
      version: 1, nodes, edges: ['sync', 'verify'].map((id, index) => ({
        from: { node: id, port: 'out' }, to: { node: nodes[index + 1].id, port: 'in' },
      })),
      inputs: { request: { node: 'sync', port: 'in' } }, outputs: { result: { node: 'project', port: 'out' } },
    },
    identity: { bindings, runtimeVersion: 'qualification@1', policyVersion: 'qualification@1', serviceProfileDigest: 'c'.repeat(64) },
    adapters: bindings.map(({ component, implementationDigest }) => ({
      component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
    })),
  });
}

export function requestFor(resource, revision = 1, needsVerification = true) {
  return { provider: 'fixture', resourceKey: resource, businessKey: resource + '-' + revision,
    revision, policy: 'reconcile-required', policyVersion: 'v1',
    payload: { resource, revision, needsVerification, verification: 'pending' } };
}

export async function stageDomain(store, request, staged) {
  const profile = domainProfile();
  const workspaceId = 'qualification';
  const jobId = request.businessKey;
  const scope = await store.withDurableTransaction(workspaceId, async tx => {
    const { rowCount } = await tx.query(`INSERT INTO qualification_domain (resource,revision) VALUES ($1,$2)
      ON CONFLICT (resource) DO UPDATE SET revision=excluded.revision WHERE qualification_domain.revision=excluded.revision-1`,
    [request.resourceKey, request.revision]);
    if (rowCount !== 1) throw Error('STALE_DOMAIN_REVISION');
    const { runId } = await tx.stage({ jobId, revisionId: 'qualification-v1', profilePin: profile.pin,
      inputs: { request: [packet(request.payload, { jobId })] } });
    const scope = { workspaceId, runId };
    if (staged) {
      const { rows: [backend] } = await tx.query('SELECT pg_backend_pid() AS pid');
      await staged({ scope, backendPid: backend.pid });
    }
    return scope;
  });
  return scope;
}

export async function publishProjection(store, scope) {
  return store.withDurableTransaction(scope.workspaceId, async tx => {
    const result = await tx.query(`INSERT INTO qualification_projection (resource,revision,verification,writes)
      SELECT p.envelope::jsonb->'value'->>'resource', (p.envelope::jsonb->'value'->>'revision')::integer,
        p.envelope::jsonb->'value'->>'verification', 1
      FROM nodeflow_durable.step_outcomes o JOIN nodeflow_durable.steps s USING(step_id)
      JOIN nodeflow_durable.step_packets p ON (p.run_id,p.packet_id)=(o.run_id,o.output_packet_id)
      WHERE o.run_id=$1 AND s.node_id='project'
      ON CONFLICT (resource) DO UPDATE SET revision=excluded.revision, verification=excluded.verification,
        writes=qualification_projection.writes+1
      WHERE qualification_projection.revision<excluded.revision`, [scope.runId]);
    return result.rowCount;
  });
}
