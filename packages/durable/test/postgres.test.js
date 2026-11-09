import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { packet } from 'event-driven-design';
import { stagePersonUpdate } from '../../../examples/durable/update-person.mjs';
import { openPostgresStore } from '../dist/postgres/index.js';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl, 'Set FBP_POSTGRES_TEST_URL to an isolated PostgreSQL test server with CREATEDB access.');
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s40_' + randomUUID().replaceAll('-', '');
let store, observer, created = false;
const workspace = 'workspace';
const profilePin = {
  format: 'nodeflow.durable-profile', version: 1, executionDigest: 'a'.repeat(64), adapterDigest: 'b'.repeat(64),
};
const submission = (jobId, value = 1) => ({
  jobId, revisionId: 'revision-v1', profilePin, inputs: { request: [packet(value, { jobId })] },
});
const count = async (job, workspaceId = workspace) => Number((await observer.query(
  'SELECT count(*) FROM nodeflow_durable.workflow_runs WHERE workspace_id = $1 AND job_id = $2', [workspaceId, job],
)).rows[0].count);
const personRevision = async () => (await observer.query('SELECT revision FROM person WHERE id = 1')).rows[0].revision;
function barrier() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

before(async () => {
  await admin.query('CREATE DATABASE ' + database);
  created = true;
  const url = new globalThis.URL(adminUrl);
  url.pathname = '/' + database;
  observer = new pg.Pool({ connectionString: url.href });
  store = openPostgresStore(url.href);
  await Promise.all([store.migrate(), store.migrate()]);
  await observer.query('CREATE TABLE person (id integer PRIMARY KEY, revision integer NOT NULL)');
  await observer.query('INSERT INTO person VALUES (1, 0)');
});
after(async () => {
  await store?.close();
  await observer?.end();
  try { if (created) await admin.query('DROP DATABASE ' + database); }
  finally { await admin.end(); }
});

test('business revision and obligation commit together and replay returns the original run', async () => {
  const request = submission('commit', { value: 'a\u0000b' });
  let leaked;
  const staged = await store.withDurableTransaction(workspace, async tx => {
    leaked = tx;
    const { rows: before } = await tx.query('SELECT pg_backend_pid() AS pid');
    const run = await stagePersonUpdate(tx, { personId: 1, expectedRevision: 0, submission: request });
    const { rows: after } = await tx.query('SELECT pg_backend_pid() AS pid');
    assert.equal(before[0].pid, after[0].pid);
    assert.equal(await personRevision(), 0);
    assert.equal(await count('commit'), 0);
    return run;
  });
  assert(staged.created);
  assert.notEqual(staged.runId, request.inputs.request[0].packetId);
  assert.equal(await personRevision(), 1);
  assert.equal(await count('commit'), 1);
  const persisted = (await observer.query('SELECT * FROM nodeflow_durable.workflow_runs WHERE run_id = $1', [staged.runId])).rows[0];
  assert.equal(persisted.status, 'queued');
  assert.equal(persisted.revision_id, request.revisionId);
  assert.equal(persisted.execution_digest, profilePin.executionDigest);
  assert.equal(persisted.adapter_digest, profilePin.adapterDigest);
  assert.deepEqual(JSON.parse(persisted.input_json), request.inputs);
  assert.match(persisted.input_fingerprint, /^[a-f0-9]{64}$/);
  const replay = await store.withDurableTransaction(workspace, tx => stagePersonUpdate(tx, {
    personId: 1, expectedRevision: 0, submission: globalThis.structuredClone(request),
  }));
  assert.deepEqual(replay, { runId: staged.runId, created: false });
  assert.equal(await personRevision(), 1);
  await assert.rejects(store.withDurableTransaction(workspace, tx => stagePersonUpdate(tx, {
    personId: 1, expectedRevision: 0, submission: submission('stale-person'),
  })), /PERSON_REVISION_CONFLICT/);
  assert.equal(await count('stale-person'), 0);
  const isolated = await store.withDurableTransaction('other-workspace', tx => tx.stage(request));
  assert.notEqual(isolated.runId, staged.runId);
  assert.equal(await count('commit', 'other-workspace'), 1);
  assert.throws(() => leaked.stage(submission('expired')), { code: 'TRANSACTION_SCOPE' });
  assert.throws(() => leaked.query('SELECT 1'), { code: 'TRANSACTION_SCOPE' });
  assert.equal(await count('expired'), 0);
});

test('rollback, pending work, and caught SQL failures leave no durable or business write', async () => {
  let leaked;
  await assert.rejects(store.withDurableTransaction(workspace, async tx => {
    leaked = tx;
    await tx.query('UPDATE person SET revision = 9 WHERE id = 1');
    await tx.stage(submission('rollback'));
    throw Error('application refused');
  }), /application refused/);
  assert.equal(await personRevision(), 1);
  assert.equal(await count('rollback'), 0);
  assert.throws(() => leaked.stage(submission('expired')), { code: 'TRANSACTION_SCOPE' });
  await assert.rejects(store.withDurableTransaction(workspace, tx => {
    void tx.stage(submission('pending'));
  }), { code: 'TRANSACTION_WORK_PENDING' });
  assert.equal(await count('pending'), 0);
  await assert.rejects(store.withDurableTransaction(workspace, async tx => {
    await tx.stage(submission('caught'));
    await assert.rejects(tx.query('SELECT 1/0'), { code: '22012' });
  }), { code: 'TRANSACTION_ABORTED' });
  assert.equal(await count('caught'), 0);
  for (const sql of ['COMMIT', null]) {
    await assert.rejects(store.withDurableTransaction(workspace, tx => tx.query(sql)), { code: 'DOMAIN_STATEMENT_REFUSED' });
  }
  await assert.rejects(store.withDurableTransaction(workspace, tx => tx.query('SELECT 1; COMMIT')), { code: '42601' });
});

test('racing jobs resolve on commit, conflicting inputs refuse, and cross-connection capabilities fail', async () => {
  const hold = barrier(), entered = barrier();
  let owner, ownerPid;
  const winning = store.withDurableTransaction(workspace, async tx => {
    owner = tx;
    ownerPid = (await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const result = await tx.stage(submission('race', 1));
    entered.release();
    await hold.promise;
    return result;
  });
  await entered.promise;
  try {
    assert.equal(await count('race'), 0);
    await store.withDurableTransaction(workspace, async tx => {
      assert.throws(() => owner.stage(submission('foreign')), { code: 'TRANSACTION_SCOPE' });
      await assert.rejects(store.withDurableTransaction(workspace, () => {}), { code: 'TRANSACTION_NESTED' });
      assert.equal((await tx.query('SELECT 1 AS value')).rows[0].value, 1);
    });
    const racing = barrier();
    const losing = store.withDurableTransaction(workspace, async tx => {
      const { rows } = await tx.query('SELECT pg_backend_pid() AS pid');
      racing.release(rows[0].pid);
      return tx.stage(submission('race', 2));
    });
    const refused = assert.rejects(losing, { code: 'INPUT_CONFLICT' });
    const loserPid = await racing.promise;
    assert.notEqual(loserPid, ownerPid);
    let blocked = false;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const { rows } = await observer.query('SELECT $1 = ANY(pg_blocking_pids($2)) AS blocked', [ownerPid, loserPid]);
        if (rows[0].blocked) { blocked = true; break; }
        await delay(10);
      }
      assert(blocked, 'losing INSERT must wait for the uncommitted winning transaction');
    } finally { hold.release(); }

    assert((await winning).created);
    await refused;
    assert.equal(await count('race'), 1);
    assert.equal(await count('foreign'), 0);
  } finally { hold.release(); await winning; }
});

test('a disconnected transaction rolls back and the pool still accepts work', async () => {
  await assert.rejects(store.withDurableTransaction(workspace, async tx => {
    const { rows } = await tx.query('SELECT pg_backend_pid() AS pid');
    await tx.query('UPDATE person SET revision = 99 WHERE id = 1');
    await tx.stage(submission('disconnect'));
    await observer.query('SELECT pg_terminate_backend($1, 1000)', [rows[0].pid]);
    throw Error('connection ended before commit');
  }), /connection ended before commit/);
  assert.equal(await personRevision(), 1);
  assert.equal(await count('disconnect'), 0);
  assert((await store.withDurableTransaction(workspace, tx => tx.stage(submission('after-disconnect')))).created);
});

test('invalid envelopes refuse before inserts and unknown schema versions refuse migration', async () => {
  const request = submission('invalid');
  const invalid = [
    null, { ...request, extra: true }, { ...request, jobId: '!' }, { ...request, revisionId: '' },
    { ...request, inputs: null }, { ...request, inputs: 3 }, { ...request, inputs: [] },
    { ...request, inputs: { '': [] } }, { ...request, inputs: { ['x'.repeat(129)]: [] } },
    { ...request, inputs: { request: 1 } }, { ...request, inputs: { request: [packet(1, { jobId: 'other' })] } },
    { ...request, inputs: { request: [request.inputs.request[0], request.inputs.request[0]] } },
    { ...request, inputs: Object.fromEntries(Array.from({ length: 4097 }, (_, i) => ['in-' + i, []])) },
    { ...request, inputs: { request: Array.from({ length: 4097 }, () => packet(1, { jobId: request.jobId })) } },
    { ...request, profilePin: { ...profilePin, version: 2 } },
  ];
  for (const input of invalid) {
    await assert.rejects(store.withDurableTransaction(workspace, tx => tx.stage(input)), { code: 'INVALID_SUBMISSION' });
  }
  assert.equal(await count('invalid'), 0);
  await assert.rejects(store.withDurableTransaction('!', () => {}), { code: 'INVALID_WORKSPACE' });
  await observer.query('UPDATE nodeflow_durable.schema_version SET version = 2');
  await assert.rejects(store.migrate(), { code: 'UNSUPPORTED_DURABLE_SCHEMA' });
});
