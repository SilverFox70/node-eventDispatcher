import 'server-only';
import type { openPostgresStore } from 'event-driven-design-durable/postgres';
import { z } from 'zod';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DemoRun } from './fixture';

const revision = z.number().int().min(0).max(2147483647);
const command = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('cancel'), expectedRevision: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.strictObject({ kind: z.literal('signal'), generation: z.uuid(), nodeId: z.string(), signalName: z.string(), expectedRevision: revision }),
  z.strictObject({ kind: z.literal('resolve'), stepId: z.uuid(), operationId: z.uuid(), expectedRevision: revision }),
]);

export async function applyDemoAction(store: ReturnType<typeof openPostgresStore>, run: DemoRun,
  providerUrl: string, input: unknown) {
  const result = command.safeParse(input);
  if (!result.success) return false;
  const { kind, expectedRevision } = result.data;
  const scope = { workspaceId: run.workspaceId, runId: run.runId };
  const actorId = 'fixture-operator';
  if (kind === 'cancel') {
    await store.cancelProgress(scope, { actorId, expectedRevision }, () => true);
    return true;
  }
  // Native ESM keeps component brands shared with the external PostgreSQL package.
  const module = pathToFileURL(join(process.cwd(), 'lib/durable/profiles.ts')).href;
  const { demoDurableProfile } = await import(/* webpackIgnore: true */ module) as typeof import('./profiles');
  if (result.data.kind === 'signal') {
    const { generation, nodeId, signalName } = result.data;
    await store.submitSignal(scope, demoDurableProfile(run.kind), {
      generation, nodeId, signalName, expectedRevision: result.data.expectedRevision,
      actorId, commandKey: 'demo-approve', payload: { approved: true },
    }, () => true);
  } else {
    const { stepId, operationId, expectedRevision } = result.data;
    await store.reconcileExternalOperation(scope, demoDurableProfile(run.kind), {
      stepId, operationId, expectedRevision, actorId, mode: 'lookup', commandKey: 'demo-resolve',
    }, {
      provider: 'fixture', policyVersion: 'v1', authorize: () => true,
      async readEvidence(binding) {
        const response = await fetch(providerUrl + '/' + encodeURIComponent(binding.businessKey), { cache: 'no-store' });
        if (!response.ok) throw Error('Provider lookup unavailable');
        return { binding, kind: 'succeeded', evidenceRef: 'fixture-confirmed', value: await response.json() };
      },
    });
  }
  return true;
}
