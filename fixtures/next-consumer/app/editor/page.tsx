import { GraphEditor } from 'event-driven-design-editor';
import 'event-driven-design-editor/styles.css';
import { catalog, fixtureCatalog, specimenCatalog } from '../../lib/editor-catalog';
import { fixtureGraph } from '../../lib/editor-run-fixture';

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<{ specimens?: string | string[]; sample?: string | string[] }>;
}) {
  const query = await searchParams;
  const specimens = query.specimens === '1';
  const sample = query.sample === '1';
  const testRun = { endpoint: '/api/editor/test-run', sampleHref: '/editor?sample=1' };
  return <main className="editor-demo">
    <h1>Graph editor</h1>
    <p>Place, drag, and connect nodes. Select a node to delete it or move it with buttons. This draft lives in the current page session.</p>
    {specimens
      ? <GraphEditor validationEndpoint="/api/editor/validate" catalog={specimenCatalog} initialNodes={[{ id: 'node-2', component: 'retired-alert@1' }]} />
      : <GraphEditor validationEndpoint="/api/editor/validate" testRun={testRun}
        catalog={sample ? fixtureCatalog : catalog} {...(sample ? { initialGraph: fixtureGraph } : {})} />}
  </main>;
}
