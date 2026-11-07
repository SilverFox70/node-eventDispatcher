import * as sqlite from 'node:sqlite';
import { canonicalJson } from 'event-driven-design/model';
import { fingerprintGraphDocument, parseGraphDocument } from '../index.js';
import type { Command, DraftResult } from './index.js';

// The pinned runtime exposes Database. The declarations still name its former alias.
const { Database } = sqlite as typeof sqlite & { Database: typeof sqlite.DatabaseSync };

function admitted(value: unknown): DraftResult {
  const document = parseGraphDocument(value);
  return { ok: true, draft: { document, ...fingerprintGraphDocument(document) } };
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
      if (version === 1) return;
      if (version !== 0) throw Error('UNSUPPORTED_DRAFT_SCHEMA');
      db.exec(`
        CREATE TABLE drafts (
          workspace_id TEXT NOT NULL,
          document_id TEXT NOT NULL,
          revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
          document TEXT NOT NULL,
          PRIMARY KEY (workspace_id, document_id)
        ) STRICT;
        PRAGMA user_version = 1;
      `);
    });
  } catch (error) {
    db.close();
    throw error;
  }
  const load = db.prepare('SELECT revision, document FROM drafts WHERE workspace_id = ? AND document_id = ?');
  const create = db.prepare('INSERT INTO drafts VALUES (?, ?, 0, ?) ON CONFLICT DO NOTHING');
  const save = db.prepare('UPDATE drafts SET revision = ?, document = ? WHERE workspace_id = ? AND document_id = ? AND revision = ?');

  function execute(command: Command, beforeCommit?: () => void): DraftResult {
    const { workspaceId, documentId } = command.scope;
    for (const id of [workspaceId, documentId]) {
      if (typeof id !== 'string' || id.length === 0 || id.length > 128) throw Error('INVALID_DRAFT_SCOPE');
    }
    if (command.kind === 'load') {
      const row = load.get(workspaceId, documentId);
      return row ? admitted(JSON.parse(String(row.document))) : { ok: false, code: 'DRAFT_NOT_FOUND' };
    }
    const revision = command.kind === 'save' ? command.expectedRevision + 1 : 0;
    if (!Number.isSafeInteger(revision) || (command.kind === 'save' && revision < 1)) throw Error('INVALID_DRAFT_REVISION');
    const document = parseGraphDocument({
      format: 'nodeflow.document', version: 1, workspaceId, documentId, draftRevision: revision,
      graph: command.content.graph, layout: command.content.layout, registryLock: command.content.registryLock,
    });
    const text = canonicalJson(document);
    const result: DraftResult = { ok: true, draft: { document, ...fingerprintGraphDocument(document) } };
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
