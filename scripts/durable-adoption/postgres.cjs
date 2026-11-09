const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { closeSync, existsSync, openSync } = require('node:fs');

function client(tool, database, args, stdio = ['ignore', 'pipe', 'pipe']) {
  const url = new globalThis.URL(database);
  const container = process.env.FBP_PG_CLIENT_CONTAINER;
  const env = { ...process.env, PGHOST: container ? '127.0.0.1' : url.hostname,
    PGPORT: container ? '5432' : (url.port || '5432'), PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
  const command = container ? 'docker' : tool;
  const argv = container ? ['exec', '-i', ...['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'].flatMap(key => ['-e', key]),
    container, tool, ...args] : args;
  const result = spawnSync(command, argv, { env, stdio, encoding: 'utf8', timeout: 45000 });
  assert.equal(result.status, 0, tool + ' failed: ' + (result.error?.code ?? '') + ' ' + (result.stderr ?? ''));
  return result.stdout;
}

function backup(database, archive) {
  const output = openSync(archive, 'wx', 0o600);
  try { client('pg_dump', database, ['--format=custom', '--no-owner', '--no-privileges'], ['ignore', output, 'pipe']); }
  finally { closeSync(output); }
}

function restore(database, archive) {
  if (!existsSync(archive)) throw Error('BACKUP_UNAVAILABLE');
  const input = openSync(archive, 'r');
  try {
    client('pg_restore', database, ['--dbname=' + new globalThis.URL(database).pathname.slice(1),
      '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges'], [input, 'pipe', 'pipe']);
  } finally { closeSync(input); }
}

module.exports = { backup, client, restore };
