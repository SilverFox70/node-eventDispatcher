import 'server-only';
import { openPostgresStore } from 'event-driven-design-durable/postgres';

export type DemoRun = Readonly<{
  slug: string; runId: string; workspaceId: string; kind: 'wait' | 'provider'; title: string;
  origin?: Readonly<{ revisionId: string; executionDigest: string; nodes: Readonly<Record<string, string>> }>;
}>;

type Fixture = { database: string; token: string; providerUrl: string; runs: DemoRun[] };
let store: ReturnType<typeof openPostgresStore> | undefined;

export function demoDurableFixture() {
  const raw = process.env.FBP_DURABLE_FIXTURE;
  return raw ? JSON.parse(raw) as Fixture : undefined;
}

export function demoDurableStore(database: string) {
  return store ??= openPostgresStore(database);
}
