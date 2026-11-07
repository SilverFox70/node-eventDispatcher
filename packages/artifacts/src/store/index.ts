import { Worker } from 'node:worker_threads';
import { prepareProfile } from '../revisions/profile.js';
import type { LockedGraph, ReceiptPins, TestProfile, TestReceipt } from '../revisions/profile.js';
import { verifyDraft } from '../revisions/verify.js';
import type { DraftVerification } from '../revisions/verify.js';
import type { GraphDocument, RegistryLock } from '../model/index.js';

export type Draft = Readonly<{ document: GraphDocument; semanticHash: string; layoutHash: string }>;
export type DraftResult = { ok: true; draft: Draft } |
  { ok: false; code: 'DRAFT_NOT_FOUND' | 'DRAFT_EXISTS' } |
  { ok: false; code: 'DRAFT_CONFLICT'; currentRevision: number };

export type DraftScope = Readonly<{ workspaceId: string; documentId: string }>;
export type DraftContent = Pick<GraphDocument, 'graph' | 'layout' | 'registryLock'>;
export type { DraftVerification, LockedGraph, TestProfile, TestReceipt };
export type RevisionCommand =
  { kind: 'receipt'; scope: DraftScope; receipt: TestReceipt } |
  { kind: 'loadRevision'; scope: DraftScope; revisionId: string } |
  { kind: 'lock'; scope: DraftScope; expectedRevision: number; receiptId: string;
    actorId: string; pins: ReceiptPins; registryLock: RegistryLock };

export type StoreResult = DraftResult | LockedGraph | TestReceipt;
export type Command = RevisionCommand | { kind: 'load'; scope: DraftScope } |
  { kind: 'create'; scope: DraftScope; content: DraftContent } |
  { kind: 'save'; scope: DraftScope; expectedRevision: number; content: DraftContent };

type Pending = { resolve: (result?: StoreResult) => void; reject: (error: Error) => void };
type Response = { id: number; result?: StoreResult; error?: string };

/** Own one bounded worker per database handle. Scopes must come from host authorization. */
export function openDraftRepository(path: string) {
  const preloads = process.execArgv.filter((flag, index, args) =>
    flag === '--import' || flag.startsWith('--import=') || args[index - 1] === '--import');
  const worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: path, execArgv: preloads });
  const pending = new Map<number, Pending>();
  let sequence = 0;
  let stopped = false;
  let closing: Promise<void> | undefined;
  function fail(error: Error) {
    stopped = true;
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }
  worker.on('error', fail);
  worker.on('exit', () => fail(Error('DRAFT_STORE_CLOSED')));
  worker.on('message', ({ id, result, error }: Response) => {
    const request = pending.get(id)!;
    pending.delete(id);
    if (error) request.reject(Error(error));
    else request.resolve(result);
    if (pending.size === 0) worker.unref();
  });
  worker.unref();
  function send(command: Command | 'close') {
    return new Promise<StoreResult | undefined>((resolve, reject) => {
      const id = ++sequence;
      worker.ref();
      pending.set(id, { resolve, reject });
      try { worker.postMessage({ id, command }); }
      catch (error) {
        pending.delete(id);
        if (!pending.size) worker.unref();
        reject(error);
      }
    });
  }
  async function execute<Result extends StoreResult>(command: Command): Promise<Result> {
    if (closing || stopped) throw Error('DRAFT_STORE_CLOSED');
    if (pending.size >= 32) throw Error('DRAFT_STORE_BUSY');
    return (await send(command)) as Result;
  }
  const loadDraft = (scope: DraftScope) => execute<DraftResult>({ kind: 'load', scope });
  const createDraft = (scope: DraftScope, content: DraftContent) => execute<DraftResult>({ kind: 'create', scope, content });
  const loadLockedRevision = (scope: DraftScope, revisionId: string) =>
    execute<LockedGraph>({ kind: 'loadRevision', scope, revisionId });
  return {
    loadDraft, createDraft, loadLockedRevision,
    saveDraft: (scope: DraftScope, expectedRevision: number, content: DraftContent) =>
      execute<DraftResult>({ kind: 'save', scope, expectedRevision, content }),
    async testDraft(scope: DraftScope, expectedRevision: number, profile: DraftVerification) {
      const target = { ...scope };
      const saved = await loadDraft(target);
      if (!saved.ok) throw Error(saved.code);
      if (saved.draft.document.draftRevision !== expectedRevision) throw Error('DRAFT_CONFLICT');
      const receipt = await verifyDraft(saved.draft, profile);
      return execute<TestReceipt>({ kind: 'receipt', scope: target, receipt });
    },
    lockRevision(scope: DraftScope, expectedRevision: number, receiptId: string, actorId: string, profile: TestProfile) {
      const { registryLock, pins } = prepareProfile(profile);
      return execute<LockedGraph>({ kind: 'lock', scope, expectedRevision, receiptId, actorId, pins, registryLock });
    },
    async forkDraft(scope: DraftScope, revisionId: string, newDocumentId: string) {
      const target = { ...scope };
      const { revision, layout } = await loadLockedRevision(target, revisionId);
      return createDraft({ ...target, documentId: newDocumentId }, { graph: revision.graph, registryLock: revision.registryLock, layout });
    },
    close: () => closing ??= (stopped ? Promise.resolve() : send('close').then(() => undefined)),
  };
}
