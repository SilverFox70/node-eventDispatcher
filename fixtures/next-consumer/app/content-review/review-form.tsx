'use client';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Product } from '../../lib/content-review/product';
import type { Explanation } from 'event-driven-design/model';

type Report = { findings: { field: string; message: string }[]; preview: { title: string; description: string } | null };
type Review = { terminal: { status: string; code?: string }; review: Report | null;
  explanation: { ok: true; explanation: Explanation } | { ok: false } };
const chair: Product = { slug: 'chair', title: 'Chair', description: 'Oak dining chair.', altText: 'Oak chair with a curved back.', archived: false };

export default function ReviewForm() {
  const [product, setProduct] = useState(chair), [mode, setMode] = useState('normal');
  const [file, setFile] = useState<File | null>(null), [result, setResult] = useState<Review | null>(null);
  const [message, setMessage] = useState('Ready'), [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setResult(null); setMessage('Reviewing');
    try {
      if (file && file.size > 4096) { setMessage('JSON file exceeds 4 KiB'); return; }
      const body = file ? await file.text() : JSON.stringify(product);
      const response = await fetch('/api/content-review?media=' + mode, { method: 'POST', body,
        signal: controller.signal, headers: { 'content-type': 'application/json' } });
      if (!response.ok) {
        const value = await response.json() as { issues: { field: string; code: string }[] };
        setMessage(value.issues.map(issue => issue.field + ': ' + issue.code).join(', ')); return;
      }
      const review = await response.json() as Review;
      setResult(review);
      setMessage(review.terminal.code ?? (review.review ? 'Review complete' : 'No preview emitted'));
    } catch {
      setMessage(controller.signal.aborted ? 'Review cancelled' : 'Review unavailable');
    } finally {
      active.current = null; setBusy(false);
    }
  }
  const explanation = result?.explanation.ok ? result.explanation.explanation : null;
  return <>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {(['slug', 'title', 'description', 'altText'] as const).map(field => <label key={field}>{field}
          <input value={product[field]} onChange={event => setProduct({ ...product, [field]: event.target.value })} />
        </label>)}
        <label><input type="checkbox" checked={product.archived} onChange={event => setProduct({ ...product, archived: event.target.checked })} /> Archived</label>
        <label>Upload product JSON<input type="file" accept=".json,application/json" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
        <label>Media demo scenario<select value={mode} onChange={event => setMode(event.target.value)}>
          <option value="normal">Normal</option><option value="slow">Slow media</option>
          <option value="retry">Transient media error</option><option value="invalid">Invalid media output</option>
        </select></label>
        <button type="submit">Review product</button>
      </fieldset>
      <button type="button" disabled={!busy} onClick={() => active.current?.abort()}>Cancel review</button>
    </form>
    <p role="status">{message}</p>
    {result?.review?.preview && <section aria-label="Product preview"><h2>{result.review.preview.title}</h2><p>{result.review.preview.description}</p></section>}
    {result?.review && <ul aria-label="Review findings">{result.review.findings.map(item => <li key={item.field}>{item.message}</li>)}</ul>}
    {explanation && <details><summary>Explain this {explanation.subject.kind}</summary>
      <p>{explanation.coverage}</p>
      <ul>{explanation.nodes.map(node => <li key={node.stream + ':' + node.record.sequence}>{
        node.stream === 'decision' ? node.record.format === 'nodeflow.decision'
          ? 'Reported ' + node.record.code : 'Observed ' + node.record.outcome
          : 'nodeId' in node.record ? node.record.nodeId + ' · ' + node.record.kind : node.record.kind
      }</li>)}</ul>
      <p>Packet parent links: {explanation.links.length}</p>
      <ul aria-label="Packet ancestry">{explanation.links.map(link => <li key={link.parent + ':' + link.child}>
        {link.parent} → {link.child}
      </li>)}</ul>
    </details>}
  </>;
}
