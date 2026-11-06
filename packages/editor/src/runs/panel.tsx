import { useEffect, useRef, useState } from 'react';
import type { GraphSpecV2 } from 'event-driven-design/model';
import { hashDraft, readRunResult, requestRun } from './protocol.js';
import type { RunResult } from './protocol.js';
import type { DebugSession } from '../debug/live-model.js';
import { RunReport } from './report.js';

export type TestRunOptions = Readonly<{ endpoint: string; sampleHref?: string }>;

export function TestRunPanel({ options, graph, revision, ready, observe }: {
  options: TestRunOptions; graph: GraphSpecV2; revision: number; ready: boolean; observe: (session: DebugSession | undefined) => void;
}) {
  const [capture, setCapture] = useState(false);
  const [input, setInput] = useState('{}');
  const [result, setResult] = useState<RunResult>();
  const [pending, setPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [issue, setIssue] = useState<string>();
  const active = useRef<{ id: string; request: AbortController } | undefined>(undefined);
  useEffect(() => () => active.current?.request.abort(), []);

  async function run() {
    if (!ready || active.current) return;
    let inputs: unknown;
    try { inputs = JSON.parse(input); }
    catch { setIssue('Enter valid JSON before running the draft.'); return; }
    const id = globalThis.crypto.randomUUID();
    const request = new AbortController();
    active.current = { id, request };
    setIssue(undefined);
    setResult(undefined);
    setPending(true);
    try {
      const graphHash = await hashDraft(graph);
      observe({ id, graph, revision, graphHash });
      const raw = await requestRun(options.endpoint, { id, revision, graphHash, graph, inputs, capture, profile: 'fixtures@1' }, 'POST', request.signal);
      setResult(readRunResult(raw, revision, graphHash));
    } catch (error) {
      observe(undefined);
      if (!request.signal.aborted) setIssue(error instanceof Error ? error.message : 'RUN_REQUEST_FAILED');
    } finally {
      active.current = undefined;
      setPending(false);
      setCancelling(false);
    }
  }

  async function cancel() {
    const current = active.current;
    if (!current) return;
    setCancelling(true);
    try {
      await requestRun(options.endpoint, { id: current.id }, 'DELETE');
    } catch {
      if (active.current === current) {
        // Aborting the pending POST also covers cancellation before the host admitted it.
        current.request.abort();
        setIssue('Cancellation could not be confirmed. Test connection closed.');
      }
    }
  }

  return <section aria-label="Test draft">
    <h3>Test draft</h3>
    <details><summary>Walk through a fixture test</summary>
      {options.sampleHref && <p><a href={options.sampleHref} target="_blank" rel="noreferrer">Open a separate sample draft</a></p>}
      <p>Validate draft, load the fixture inputs, then choose Run test. The sample splits each item into two lookups and joins their results.</p>
      <p>For chair, expect label CHAIR and units 5. Results appear below. Cancel stops the active test. Edits apply to your next run.</p>
      <button type="button" onClick={() => setInput(JSON.stringify({ item: ['chair', 'desk', 'lamp'] }, null, 2))}>Load fixture inputs</button>{' '}
      <button type="button" onClick={() => setInput(JSON.stringify({ item: ['slow'] }, null, 2))}>Load slow-branch input</button>
    </details>
    <label>Test inputs as JSON <textarea value={input} onChange={event => setInput(event.currentTarget.value)} rows={5} /></label>
    <label><input type="checkbox" checked={capture} onChange={event => setCapture(event.currentTarget.checked)} /> Capture test payloads</label>
    <p>Use an array of values for each exposed input. Validate the current draft before running.</p>
    <button type="button" disabled={!ready || pending} onClick={() => void run()}>Run test</button>{' '}
    <button type="button" disabled={!pending || cancelling} onClick={() => void cancel()}>Cancel test</button>
    {pending && <p role="status">{cancelling ? 'Cancelling test…' : 'Test running…'}</p>}
    <RunReport issue={issue} result={result} revision={revision} />
  </section>;
}
