import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as sqlite from 'node:sqlite';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { openDraftRepository } from '../dist/store/index.js';
import { openDraftDatabase } from '../dist/store/database.js';

const scope = { workspaceId: 'a', documentId: 'draft' };
const other = { ...scope, workspaceId: 'b' };
const content = { graph: { version: 2, nodes: [], edges: [], inputs: {}, outputs: {} },
  layout: { positions: {}, groups: {} },
  registryLock: { version: 1, bindings: [], representations: [], policyVersion: 'policy' } };
const changed = { ...content, layout: { ...content.layout, viewport: { x: 1, y: 2, zoom: 1 } } };

test('SQLite draft revisions serialize across independent workers and survive reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodeflow-drafts-'));
  const path = join(directory, 'draft.sqlite');
  const left = openDraftRepository(path);
  const right = openDraftRepository(path);
  try {
    assert.deepEqual(await left.loadDraft(scope), { ok: false, code: 'DRAFT_NOT_FOUND' });
    assert((await left.createDraft(scope, content)).ok);
    assert.deepEqual(await right.createDraft(scope, content), { ok: false, code: 'DRAFT_EXISTS' });
    for (let revision = 0; revision < 4; revision++) {
      assert.equal((await left.saveDraft(scope, revision, content)).draft.document.draftRevision, revision + 1);
    }
    const prior = (await left.loadDraft(scope)).draft;
    const conflict = { ok: false, code: 'DRAFT_CONFLICT', currentRevision: 4 };
    assert.deepEqual(await left.saveDraft(scope, 3, changed), conflict);
    assert.deepEqual(await left.loadDraft(other), { ok: false, code: 'DRAFT_NOT_FOUND' });
    assert.deepEqual(await left.saveDraft(other, 4, changed), { ok: false, code: 'DRAFT_NOT_FOUND' });
    await assert.rejects(left.saveDraft(scope, -1, changed), /INVALID_DRAFT_REVISION/);
    await assert.rejects(left.loadDraft({ ...scope, workspaceId: '' }), /INVALID_DRAFT_SCOPE/);
    const results = await Promise.all([left.saveDraft(scope, 4, changed), right.saveDraft(scope, 4, changed)]);
    assert.deepEqual(results.find(result => !result.ok), { ...conflict, currentRevision: 5 });
    const committed = results.find(result => result.ok).draft;
    assert.equal(committed.document.draftRevision, 5);
    assert.equal(committed.semanticHash, prior.semanticHash);
    assert.notEqual(committed.layoutHash, prior.layoutHash);
    await left.close();
    await right.close();
    await assert.rejects(left.loadDraft(scope), /DRAFT_STORE_CLOSED/);
    const reopened = openDraftRepository(path);
    try { assert.deepEqual(await reopened.loadDraft(scope), { ok: true, draft: committed }); }
    finally { await reopened.close(); }
  } finally {
    await left.close();
    await right.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('crash after SQL update and before commit leaves the prior draft intact', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodeflow-crash-'));
  const path = join(directory, 'draft.sqlite');
  try {
    const database = openDraftDatabase(path);
    const initial = database.execute({ kind: 'create', scope, content });
    assert.throws(() => database.execute({ kind: 'save', scope, content: changed, expectedRevision: 0 }, () => {
      throw Error('ROLLBACK_FIXTURE');
    }), /ROLLBACK_FIXTURE/);
    assert.deepEqual(database.execute({ kind: 'load', scope }), initial);
    database.close();
    assert.throws(() => database.execute({ kind: 'load', scope }));
    const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(new URL('./store/crash.js', import.meta.url)), path],
      { stdio: ['ignore', 'pipe', 'inherit'] });
    const exited = once(child, 'exit');
    try {
      const reached = await Promise.race([once(child.stdout, 'data').then(([data]) => data.toString()), exited.then(() => '')]);
      assert.match(reached, /UNCOMMITTED/);
    } finally {
      child.kill('SIGKILL');
      await exited;
    }
    const reopened = openDraftDatabase(path);
    try { assert.deepEqual(reopened.execute({ kind: 'load', scope }), initial); }
    finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('worker bounds the queue and reports closed or invalid storage', async () => {
  const repository = openDraftRepository(':memory:');
  try {
    const loads = Array.from({ length: 32 }, () => repository.loadDraft(scope));
    await assert.rejects(repository.loadDraft(scope), /DRAFT_STORE_BUSY/);
    await Promise.all(loads);
    await assert.rejects(repository.createDraft(scope, { ...content, layout: () => {} }), /could not be cloned/i);
  } finally { await repository.close(); }

  const directory = mkdtempSync(join(tmpdir(), 'nodeflow-version-'));
  const path = join(directory, 'draft.sqlite');
  try {
    const database = new sqlite.Database(path);
    database.exec('PRAGMA user_version = 99');
    database.close();
    const incompatible = openDraftRepository(path);
    await assert.rejects(incompatible.loadDraft(scope), /UNSUPPORTED_DRAFT_SCHEMA/);
    await incompatible.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
