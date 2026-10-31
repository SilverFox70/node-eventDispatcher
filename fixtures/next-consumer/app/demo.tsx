'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { validateGraph } from 'event-driven-design/model';
import type { Catalog, GraphSpec } from 'event-driven-design/model';
import { createLatestRequest } from '../lib/latest-request';
import type { DemoResult } from '../lib/protocol';

export default function Demo({ spec, catalog }: { spec: GraphSpec; catalog: Catalog }) {
  const valid = validateGraph(spec, catalog).ok;
  const [value, setValue] = useState('2');
  const [result, setResult] = useState<DemoResult | 'loading' | 'unavailable' | null>(null);
  const [request] = useState(() => createLatestRequest(setResult));
  useEffect(() => () => request.cancel(), [request]);
  return <section>
    <p>Graph: {valid ? 'Ready' : 'Invalid graph metadata'}</p>
    <details><summary>Public graph metadata</summary><pre data-testid="graph-metadata">{JSON.stringify({ spec, catalog }, null, 2)}</pre></details>
    <form onSubmit={event => { event.preventDefault(); void request.run(Number(value)); }}>
      <label>Number <input name="value" type="number" step="any" value={value} required onChange={event => setValue(event.target.value)} /></label>
      <button disabled={!valid}>Run flow</button>
    </form>
    <Link href="/finished">Leave demo</Link>
    <p><Link href="/inspector">Inspect graphs and events</Link></p>
    <div role="status" aria-live="polite">
      {result === 'loading' && 'Running…'}
      {result === 'unavailable' && 'Request unavailable'}
      {result && typeof result === 'object' && <>
        {'status' in result.reply ? <p>Result: {result.reply.value}</p> : <>
          <p>Backend: {result.reply.code}</p>
          {result.reply.validation && <div>
            <p>Node: {result.reply.validation.nodeId}, port: {result.reply.validation.port} ({result.reply.validation.direction})</p>
            {result.reply.validation.issues.map((issue, index) => <p key={index}>Validation: {issue.code} at {JSON.stringify(issue.path)}</p>)}
          </div>}
        </>}
        <small>Request: {result.requestId} · Graph: {result.graphRevision} · Run: {result.runId || 'not started'}</small>
      </>}
    </div>
  </section>;
}
