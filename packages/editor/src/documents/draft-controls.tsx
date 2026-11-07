import { useEffect, useRef, useState } from 'react';
import type { EditorDocument } from '../document/types.js';

export type DraftStorage = Readonly<{ endpoint: string; revision: number | null }>;
type Status = 'clean' | 'saving' | 'failed' | 'conflict';

export function DraftControls({ storage, document }: { storage: DraftStorage; document: EditorDocument }) {
  const saved = useRef(document);
  const revision = useRef(storage.revision);
  const running = useRef(false);
  const [status, setStatus] = useState<Status>('clean');
  const dirty = document !== saved.current;

  async function flush() {
    if (!dirty || running.current || status === 'conflict') return;
    running.current = true;
    setStatus('saving');
    try {
      const response = await globalThis.fetch(storage.endpoint, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision.current, ...document }),
      });
      if (response.status === 409) { setStatus('conflict'); return; }
      if (!response.ok) throw Error('DRAFT_SAVE_FAILED');
      const result = await response.json() as { revision: unknown };
      const next = revision.current === null ? 0 : revision.current + 1;
      if (result.revision !== next) throw Error('DRAFT_INVALID_ACK');
      saved.current = document;
      revision.current = next;
      setStatus('clean');
    } catch { setStatus('failed'); }
    finally { running.current = false; }
  }

  useEffect(() => {
    if (!dirty || status === 'saving' || status === 'conflict') return;
    if (status === 'failed') return;
    const timer = globalThis.setTimeout(() => void flush(), 250);
    return () => globalThis.clearTimeout(timer);
  }, [document, status, dirty]);

  useEffect(() => {
    if (!dirty && status !== 'saving') return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    globalThis.addEventListener('beforeunload', warn);
    return () => globalThis.removeEventListener('beforeunload', warn);
  }, [dirty, status]);

  return <section aria-label="Saved draft">
    <h3>Saved draft</h3>
    <p role="status">{status === 'conflict' ? 'Another tab saved a newer revision. Your edits are unsaved. Reopen the saved draft in a new tab to compare.'
      : status === 'failed' ? 'Save failed. Your edits are unsaved.'
      : status === 'saving' ? 'Saving draft…'
      : dirty ? 'Unsaved edits'
      : revision.current === null ? 'No saved revision yet' : `Saved revision ${revision.current}`}</p>
    <button type="button" disabled={!dirty || status === 'saving' || status === 'conflict'} onClick={() => void flush()}>
      Save draft now
    </button>
  </section>;
}
