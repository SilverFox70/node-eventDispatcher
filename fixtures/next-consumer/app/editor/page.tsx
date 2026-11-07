import { headers } from 'next/headers';
import { GraphEditor } from 'event-driven-design-editor';
import 'event-driven-design-editor/styles.css';
import { catalog, fixtureCatalog, specimenCatalog } from '../../lib/editor-catalog';
import { Walkthrough } from './walkthrough';
import { isLocalDraftHost, loadEditorDraft } from '../../lib/editor-drafts';
import { fixtureGraph } from '../../lib/editor-run-fixture';

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<{ specimens?: string | string[]; sample?: string | string[]; walkthrough?: string | string[]; saved?: string | string[] }>;
}) {
  const query = await searchParams;
  const specimens = query.specimens === '1';
  const sample = query.sample === '1';
  const saved = query.saved === '1' && !specimens && !sample && query.walkthrough !== '1' &&
    isLocalDraftHost((await headers()).get('host'));
  const document = saved ? await loadEditorDraft() : undefined;
  const testRun = { endpoint: '/api/editor/test-run', sampleHref: '/editor?sample=1' };
  return <main className="editor-demo">
    <h1>Graph editor</h1>
    {saved ? <p>This local draft saves to SQLite. <a href="/editor?saved=1" target="_blank" rel="noreferrer">Open saved draft in a new tab</a></p>
      : <p><a href="/editor?saved=1">Open saved draft</a></p>}
    <p>Place, drag, and connect nodes. Select a node to delete it or move it with buttons. {!saved && 'This draft lives in the current page session.'}</p>
    <Walkthrough practice={query.walkthrough === '1'} />
    {specimens
      ? <GraphEditor validationEndpoint="/api/editor/validate" catalog={specimenCatalog} initialNodes={[{ id: 'node-2', component: 'retired-alert@1' }]} />
      : <GraphEditor validationEndpoint="/api/editor/validate" testRun={testRun}
        catalog={sample ? fixtureCatalog : catalog}
        {...(saved ? { draftStorage: { endpoint: '/api/editor/draft', revision: document?.draftRevision ?? null },
          ...(document?.graph.version === 2 ? { initialGraph: document.graph, initialLayout: document.layout } : {}) } : {})} {...(sample ? { initialGraph: fixtureGraph } : {})} />}
  </main>;
}
