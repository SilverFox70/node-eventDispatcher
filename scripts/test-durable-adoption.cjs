const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { installedPackage } = require('../test/package-fixture.cjs');
const { backup, client, restore } = require('./durable-adoption/postgres.cjs');
const { installWorkspace } = require('./durable-adoption/workspace.cjs');

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl, 'Set FBP_POSTGRES_TEST_URL to a disposable PostgreSQL service');

function node(database, entry, args = []) {
  return spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 15000,
    env: { ...process.env, FBP_APPROVAL_DATABASE_URL: database } });
}
function execute(database, entry, args) {
  const result = node(database, entry, args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function json(database, entry, args) { return JSON.parse(execute(database, entry, args)); }
function refuse(database, entry, args, reason) {
  const result = node(database, entry, args);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, reason);
}

function copyDemo(root, fixture) {
  cpSync(join(root, 'examples/durable/approval'), join(fixture, 'approval'), { recursive: true });
  cpSync(join(root, 'scripts/durable-adoption/legacy.mjs'), join(fixture, 'legacy.mjs'));
  mkdirSync(join(fixture, 'fixtures'));
  for (const file of ['join-profile.mjs', 'step-profile.mjs']) {
    const input = readFileSync(join(root, 'packages/durable/test/fixtures', file), 'utf8')
      .replace('../../dist/index.js', 'event-driven-design-durable');
    writeFileSync(join(fixture, 'fixtures', file), input);
  }
}

async function retained(observer) {
  const { rows: [state] } = await observer.query(`SELECT
    (SELECT json_agg(a ORDER BY revision_id) FROM approval_artifacts a) AS artifacts,
    (SELECT json_agg(r ORDER BY job_id) FROM (
      SELECT run_id,job_id,revision_id,execution_digest,adapter_digest FROM nodeflow_durable.workflow_runs
    ) r) AS bindings,
    (SELECT json_agg(o ORDER BY business_key) FROM nodeflow_durable.external_operations o) AS operations,
    (SELECT json_agg(j ORDER BY run_id,node_id) FROM nodeflow_durable.join_completions j) AS completions`);
  assert(state.artifacts?.length && state.operations?.length && state.completions?.length);
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

async function assertRetention(observer) {
  for (const table of ['workflow_runs', 'external_operations', 'join_completions', 'signal_inbox']) {
    for (const command of ['DELETE FROM', 'TRUNCATE']) {
      await assert.rejects(observer.query(command + ' nodeflow_durable.' + table + (command === 'TRUNCATE' ? ' CASCADE' : '')), {
        code: '23514', message: 'DURABLE_RETENTION_REQUIRED',
      });
    }
  }
}

function assertResumed(result, expected, jobId) {
  assert.equal(result.runId, expected.runId);
  assert.equal(result.jobId, jobId);
  assert.equal(result.receipt.state, 'consumed');
  assert.equal(result.outputs.length, 1);
  assert.deepEqual(result.outputs[0].packet.value, { approved: true, disposition: 'recorded' });
}

async function main() {
  const core = installedPackage();
  try {
    const graph = JSON.parse(core.run('npm', ['ls', '--all', '--json']));
    assert(!/node_modules\/pg|event-driven-design-(artifacts|durable)|"pg"/.test(JSON.stringify(graph)));
    core.run(process.execPath, ['--input-type=module', '-e', "import { packet } from 'event-driven-design'; if (packet(1).value !== 1) process.exit(1)"]);
  } finally { core.dispose(); }

  const packed = installedPackage({ additionalPackages: ['packages/artifacts', 'packages/durable'] });
  const temporary = mkdtempSync(join(tmpdir(), 'nodeflow-adoption-'));
  const databases = [];
  const observers = [];
  const { Pool } = createRequire(join(packed.fixture, 'package.json'))('pg');
  const admin = new Pool({ connectionString: adminUrl });
  async function createDatabase() {
    const name = 's51_' + randomUUID().replaceAll('-', '');
    await admin.query('CREATE DATABASE ' + name);
    databases.push(name);
    const database = new globalThis.URL(adminUrl);
    database.pathname = '/' + name;
    const observer = new Pool({ connectionString: database.href });
    observers.push(observer);
    return { database: database.href, observer };
  }
  try {
    copyDemo(packed.root, packed.fixture);
    const { seedLegacy, verifyMissingEvidence } = await import(pathToFileURL(join(packed.fixture, 'legacy.mjs')).href);
    const cli = join(packed.fixture, 'approval/cli.mjs');
    const migrate = join(packed.fixture, 'approval/migrate.mjs');
    const { database: source, observer } = await createDatabase();
    const legacy = await seedLegacy(observer, source);
    const history = await retained(observer);
    execute(source, migrate);
    assert.equal((await observer.query('SELECT version FROM nodeflow_durable.schema_version')).rows[0].version, 10);
    assert.equal(await retained(observer), history);
    await assertRetention(observer);
    assert.equal(await retained(observer), history);

    const { database: restored, observer: target } = await createDatabase();
    const archive = join(temporary, 'approval.dump');
    assert.throws(() => restore(restored, archive), /BACKUP_UNAVAILABLE/);
    backup(source, archive);
    restore(restored, archive);
    assert.equal(await retained(target), history);
    await assertRetention(target);
    await verifyMissingEvidence(restored, legacy.uncertain);
    await target.query('UPDATE nodeflow_durable.schema_version SET version=11');
    refuse(restored, migrate, [], /UNSUPPORTED_DURABLE_SCHEMA/);
    await target.query('UPDATE nodeflow_durable.schema_version SET version=10');

    const runId = legacy.approval.runId;
    const complete = json(restored, cli, ['approve', runId]);
    assertResumed(complete, legacy.approval, 'packed-approval');
    assert.deepEqual(json(restored, cli, ['approve', runId]), complete);
    const { rows: [counts] } = await target.query(`SELECT
      (SELECT count(*)::integer FROM nodeflow_durable.signal_inbox WHERE run_id=$1 AND state='consumed') AS signals,
      (SELECT count(*)::integer FROM nodeflow_durable.deliveries WHERE run_id=$1) AS deliveries`, [runId]);
    assert.deepEqual(counts, { signals: 1, deliveries: 1 });
    await assertRetention(target);
    assert.equal((await observer.query('SELECT status FROM nodeflow_durable.workflow_runs WHERE run_id=$1', [runId])).rows[0].status, 'queued');

    const { database: fresh, observer: freshObserver } = await createDatabase();
    execute(fresh, migrate);
    await freshObserver.query(readFileSync(join(packed.fixture, 'approval/schema.sql'), 'utf8'));
    const packedRun = json(fresh, cli, ['stage', 'fresh-packed']);
    assertResumed(json(fresh, cli, ['approve', packedRun.runId]), packedRun, 'fresh-packed');

    const workspace = installWorkspace(packed.root, join(temporary, 'workspace'));
    const local = json(fresh, workspace.entry, ['stage', 'workspace-approval']);
    const before = readFileSync(workspace.handler, 'utf8');
    writeFileSync(workspace.handler, before.replace("'recorded'", "'changed'"));
    workspace.build();
    refuse(fresh, workspace.entry, ['approve', local.runId], /REGISTRY_LOCK_MISMATCH/);
    const { rows: [held] } = await freshObserver.query(`SELECT status,
      (SELECT count(*)::integer FROM nodeflow_durable.signal_inbox WHERE run_id=$1) AS signals
      FROM nodeflow_durable.workflow_runs WHERE run_id=$1`, [local.runId]);
    assert.deepEqual(held, { status: 'queued', signals: 0 });
    writeFileSync(workspace.handler, before);
    workspace.build();
    assertResumed(json(fresh, workspace.entry, ['approve', local.runId]), local, 'workspace-approval');
    const { rows: [version] } = await observer.query('SHOW server_version');
    console.log('Adoption verified:', process.version, version.server_version,
      client('pg_dump', source, ['--version']).trim(), client('pg_restore', source, ['--version']).trim());
  } finally {
    try {
      await Promise.all(observers.map(connection => connection.end()));
      for (const name of databases) await admin.query('DROP DATABASE ' + name);
    } finally {
      await admin.end();
      rmSync(temporary, { recursive: true, force: true });
      packed.dispose();
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
