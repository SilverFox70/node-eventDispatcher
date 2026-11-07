import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { canonicalJson } from 'event-driven-design/model';
import { assertRegistryLockMatches } from '../model/index.js';
import { name } from '../model/fields.js';
import type { LockedGraph, TestReceipt } from '../revisions/profile.js';
import type { Draft, DraftScope, RevisionCommand } from './index.js';

export function migrateRevisions(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE test_receipts (
      workspace_id TEXT NOT NULL, document_id TEXT NOT NULL, receipt_id TEXT NOT NULL, receipt TEXT NOT NULL,
      PRIMARY KEY (workspace_id, document_id, receipt_id)
    ) STRICT;
    CREATE TABLE locked_revisions (
      workspace_id TEXT NOT NULL, document_id TEXT NOT NULL, revision_id TEXT NOT NULL, evidence TEXT NOT NULL, content TEXT NOT NULL,
      PRIMARY KEY (workspace_id, document_id, revision_id),
      UNIQUE (workspace_id, document_id, evidence)
    ) STRICT;
    PRAGMA user_version = 2;
  `);
}

export function revisionStore(db: DatabaseSync, read: (scope: DraftScope) => Draft | undefined, write: <T>(fn: () => T) => T) {
  const addReceipt = db.prepare('INSERT INTO test_receipts VALUES (?, ?, ?, ?)');
  const findReceipt = db.prepare('SELECT receipt FROM test_receipts WHERE workspace_id = ? AND document_id = ? AND receipt_id = ?');
  const findRevision = db.prepare('SELECT content FROM locked_revisions WHERE workspace_id = ? AND document_id = ? AND revision_id = ?');
  const findEvidence = db.prepare('SELECT content FROM locked_revisions WHERE workspace_id = ? AND document_id = ? AND evidence = ?');
  const addRevision = db.prepare('INSERT INTO locked_revisions VALUES (?, ?, ?, ?, ?)');

  function execute(command: RevisionCommand): LockedGraph | TestReceipt {
    const { workspaceId, documentId } = command.scope;
    if (command.kind === 'receipt') {
      addReceipt.run(workspaceId, documentId, command.receipt.receiptId, canonicalJson(command.receipt));
      return command.receipt;
    }
    if (command.kind === 'loadRevision') {
      const row = findRevision.get(workspaceId, documentId, command.revisionId);
      if (!row) throw Error('LOCKED_REVISION_NOT_FOUND');
      return JSON.parse(String(row.content)) as LockedGraph;
    }
    if (!name(command.actorId) || !name(command.receiptId)) throw Error('INVALID_LOCK_REQUEST');
    return write(() => {
      const draft = read(command.scope);
      if (!draft) throw Error('DRAFT_NOT_FOUND');
      const { document, semanticHash } = draft;
      if (document.draftRevision !== command.expectedRevision) throw Error('DRAFT_CONFLICT');
      assertRegistryLockMatches(document, command.registryLock);
      const row = findReceipt.get(workspaceId, documentId, command.receiptId);
      if (!row) throw Error('TEST_RECEIPT_NOT_FOUND');
      const receipt = JSON.parse(String(row.receipt)) as TestReceipt;
      const evidence: Record<string, unknown> = { ...receipt };
      delete evidence.receiptId;
      const key = canonicalJson(evidence);
      if (key !== canonicalJson({ ...command.pins, semanticHash, policyVersion: document.registryLock.policyVersion,
        version: 1, outcome: 'passed' })) throw Error('TEST_RECEIPT_MISMATCH');

      const previous = findEvidence.get(workspaceId, documentId, key);
      if (previous) return JSON.parse(String(previous.content)) as LockedGraph;
      const revisionId = randomUUID();
      const locked: LockedGraph = { layout: document.layout, revision: {
        format: 'nodeflow.revision', version: 1, revisionId, documentId, semanticHash, graph: document.graph,
        registryLock: document.registryLock, testReceipt: receipt, createdAt: new Date().toISOString(), actorId: command.actorId,
      } };
      addRevision.run(workspaceId, documentId, revisionId, key, canonicalJson(locked));
      return locked;
    });
  }
  return execute;
}
