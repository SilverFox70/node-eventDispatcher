import { Worker } from 'node:worker_threads';
import type { GraphDocument } from '../model/index.js';

export type Draft = Readonly<{ document: GraphDocument; semanticHash: string; layoutHash: string }>;
export type DraftResult = { ok: true; draft: Draft } |
  { ok: false; code: 'DRAFT_NOT_FOUND' | 'DRAFT_EXISTS' } |
  { ok: false; code: 'DRAFT_CONFLICT'; currentRevision: number };

export type DraftScope = Readonly<{ workspaceId: string; documentId: string }>;
export type DraftContent = Pick<GraphDocument, 'graph' | 'layout' | 'registryLock'>;
export type Command = { kind: 'load'; scope: DraftScope } |
  { kind: 'create'; scope: DraftScope; content: DraftContent } |
  { kind: 'save'; scope: DraftScope; expectedRevision: number; content: DraftContent };

type Pending = { resolve: (result?: DraftResult) => void; reject: (error: Error) => void };
type Response = { id: number; result?: DraftResult; error?: string };

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
    return new Promise<DraftResult | undefined>((resolve, reject) => {
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
  async function execute(command: Command): Promise<DraftResult> {
    if (closing || stopped) throw Error('DRAFT_STORE_CLOSED');
    if (pending.size >= 32) throw Error('DRAFT_STORE_BUSY');
    return (await send(command))!;
  }
  return {
    loadDraft: (scope: DraftScope) => execute({ kind: 'load', scope }),
    createDraft: (scope: DraftScope, content: DraftContent) => execute({ kind: 'create', scope, content }),
    saveDraft: (scope: DraftScope, expectedRevision: number, content: DraftContent) =>
      execute({ kind: 'save', scope, expectedRevision, content }),
    close: () => closing ??= (stopped ? Promise.resolve() : send('close').then(() => undefined)),
  };
}
