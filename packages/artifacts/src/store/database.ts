import * as sqlite from 'node:sqlite';
import { canonicalJson } from 'event-driven-design/model';
import { fingerprintGraphDocument } from '../fingerprint.js';
import { parseGraphDocument } from '../model/index.js';
import { migrateRevisions, revisionStore } from './revisions.js';
import type { Command, Draft, StoreResult } from './index.js';

// The pinned runtime exposes Database. The declarations still name its former alias.
const { Database } = sqlite as typeof sqlite & { Database: typeof sqlite.DatabaseSync };

function admitted(value: unknown): Draft {
  const document = parseGraphDocument(value);
  return { document, ...fingerprintGraphDocument(document) };
}

export function openDraftDatabase(path: string) {
  const db = new Database(path, { timeout: 5000 });
  function write<T>(operation: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  try {
    db.exec('PRAGMA synchronous = FULL');
    write(() => {
      const version = db.prepare('PRAGMA user_version').get()?.user_version;
      if (version === 2) return;
      if (version !== 0 && version !== 1) throw Error('UNSUPPORTED_DRAFT_SCHEMA');
      if (version === 0) db.exec(`
        CREATE TABLE drafts (
          workspace_id TEXT NOT NULL,
          document_id TEXT NOT NULL,
          revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
          document TEXT NOT NULL,
          PRIMARY KEY (workspace_id, document_id)
        ) STRICT;
      `);
      migrateRevisions(db);
    });
  } catch (error) {
    db.close();
    throw error;
  }
  const load = db.prepare('SELECT revision, document FROM drafts WHERE workspace_id = ? AND document_id = ?');
  const create = db.prepare('INSERT INTO drafts VALUES (?, ?, 0, ?) ON CONFLICT DO NOTHING');
  const save = db.prepare('UPDATE drafts SET revision = ?, document = ? WHERE workspace_id = ? AND document_id = ? AND revision = ?');

  const revisions = revisionStore(db, ({ workspaceId, documentId }) => {
    const row = load.get(workspaceId, documentId);
    return row ? admitted(JSON.parse(String(row.document))) : undefined;
  }, write);

  function execute(command: Command, beforeCommit?: () => void): StoreResult {
    const { workspaceId, documentId } = command.scope;
    for (const id of [workspaceId, documentId]) {
      if (typeof id !== 'string' || id.length === 0 || id.length > 128) throw Error('INVALID_DRAFT_SCOPE');
    }
    if (command.kind === 'load') {
      const row = load.get(workspaceId, documentId);
      return row ? { ok: true, draft: admitted(JSON.parse(String(row.document))) } : { ok: false, code: 'DRAFT_NOT_FOUND' };
    }
    if (command.kind !== 'create' && command.kind !== 'save') return revisions(command);
    const revision = command.kind === 'save' ? command.expectedRevision + 1 : 0;
    if (!Number.isSafeInteger(revision) || (command.kind === 'save' && revision < 1)) throw Error('INVALID_DRAFT_REVISION');
    const document = parseGraphDocument({
      format: 'nodeflow.document', version: 1, workspaceId, documentId, draftRevision: revision,
      graph: command.content.graph, layout: command.content.layout, registryLock: command.content.registryLock,
    });
    const text = canonicalJson(document);
    const result = { ok: true as const, draft: { document, ...fingerprintGraphDocument(document) } };
    return write(() => {
      if (command.kind === 'create') {
        if (!create.run(workspaceId, documentId, text).changes) return { ok: false, code: 'DRAFT_EXISTS' };
      } else if (!save.run(revision, text, workspaceId, documentId, command.expectedRevision).changes) {
        const row = load.get(workspaceId, documentId);
        return row ? { ok: false, code: 'DRAFT_CONFLICT', currentRevision: Number(row.revision) }
          : { ok: false, code: 'DRAFT_NOT_FOUND' };
      }
      beforeCommit?.();
      return result;
    });
  }
  return { execute, close: () => db.close() };
}
