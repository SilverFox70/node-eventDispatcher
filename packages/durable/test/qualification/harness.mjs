import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { openPostgresStore } from '../../dist/postgres/index.js';
import { startProvider } from '../../../../fixtures/durable-provider/qualification.mjs';
import { domainProfile } from './domain-profile.mjs';
import { joinProfile } from '../fixtures/join-profile.mjs';
import { waitProfile } from '../fixtures/wait-profile.mjs';
import { supervise } from './supervisor.mjs';
import { matrix, validateEvidence } from './evidence.mjs';

export async function withQualification(caseId, seed, work) {
  const admin = new pg.Pool({ connectionString: process.env.FBP_POSTGRES_TEST_URL });
  const database = 'qualification_' + randomUUID().replaceAll('-', '');
  const url = new globalThis.URL(process.env.FBP_POSTGRES_TEST_URL);
  url.pathname = '/' + database;
  let created = false, observer, store, provider, supervisor, receipt;
  try {
    await admin.query('CREATE DATABASE ' + database);
    created = true;
    observer = new pg.Pool({ connectionString: url.href });
    store = openPostgresStore(url.href);
    await store.migrate();
    await observer.query(`CREATE TABLE qualification_domain (resource text PRIMARY KEY, revision integer NOT NULL);
      CREATE TABLE qualification_projection (resource text PRIMARY KEY, revision integer NOT NULL,
        verification text NOT NULL, writes integer NOT NULL)`);
    provider = await startProvider();
    supervisor = supervise(url.href);
    const a = supervisor.spawn('worker-a'), b = supervisor.spawn('worker-b');
    const trace = [];
    const record = (label, identity, worker) => trace.push({
      caseId, label, identity, ...(worker ? { pid: worker.pid } : { source: 'sql' }),
    });
    const accepted = effect => trace.push({
      caseId, label: 'provider-accepted', identity: effect.key, receipt: effect.receipt,
    });
    const result = await work({ observer, store, provider, a, b, record, accepted });
    const profile = matrix[caseId].profile;
    const factories = { domain: domainProfile, join: joinProfile, wait: waitProfile };
    const expected = factories[profile]();
    const pin = result.scope ? await store.queryRun(result.scope, { actorId: 'proof' }, () => true) : expected.pin;
    const bindings = ({ executionDigest, adapterDigest }) => [executionDigest, adapterDigest];
    validateEvidence(caseId, trace, supervisor.workers, provider.effects, bindings(pin), bindings(expected.pin), seed, result.proved);
    const { rows: [version] } = await observer.query('SHOW server_version');
    receipt = { caseId, seed, fault: matrix[caseId].fault, node: process.version, postgres: version.server_version,
      pin: bindings(pin), barriers: trace.map(event => event.label), effects: provider.effects.map(effect => effect.receipt) };
  } finally {
    const cleanup = await Promise.allSettled([
      supervisor?.close(), provider?.close(), store?.close(), observer?.end(),
    ]);
    try {
      if (created) await admin.query('DROP DATABASE ' + database);
      for (const result of cleanup) assert.equal(result.status, 'fulfilled', result.reason?.message);
    } finally { await admin.end(); }
  }
  return { ...receipt, cleanup: 'verified' };
}

export async function expireClaim(observer, claim) {
  const changed = await observer.query(`UPDATE nodeflow_durable.steps
    SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE step_id=$1 AND epoch=$2`,
  [claim.stepId, claim.epoch]);
  assert.equal(changed.rowCount, 1);
}

export async function prepare(worker, scope, request, external = false) {
  const claim = await worker.call({ kind: 'claim', scope, external });
  assert.equal(claim.nodeId, 'sync');
  const operation = await worker.call({ kind: 'prepare', scope, request, claim });
  assert.equal(operation.state, 'prepared');
  return { scope, request, claim, operationId: operation.operationId };
}

export async function projection(observer, resource, revision, verification, writes = 1) {
  const { rows } = await observer.query('SELECT revision,verification,writes FROM qualification_projection WHERE resource=$1', [resource]);
  assert.deepEqual(rows, [{ revision, verification, writes }]);
}

export async function absentSubmission(observer, request) {
  const { rows: [row] } = await observer.query(`SELECT
    EXISTS (SELECT 1 FROM qualification_domain WHERE resource=$1) AS domain,
    EXISTS (SELECT 1 FROM nodeflow_durable.workflow_runs WHERE job_id=$2) AS obligation`,
  [request.resourceKey, request.businessKey]);
  assert.deepEqual(row, { domain: false, obligation: false });
}
