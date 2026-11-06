import { GraphEditor } from 'event-driven-design-editor';
import 'event-driven-design-editor/styles.css';
import { catalog, specimenCatalog } from '../../lib/editor-catalog';

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<{ specimens?: string | string[] }>;
}) {
  const specimens = (await searchParams).specimens === '1';
  return <main className="editor-demo">
    <h1>Graph editor</h1>
    <p>Place, drag, and connect nodes. Select a node to delete it or move it with buttons. This draft lives in the current page session.</p>
    {specimens
      ? <GraphEditor validationEndpoint="/api/editor/validate" catalog={specimenCatalog} initialNodes={[{ id: 'node-2', component: 'retired-alert@1' }]} />
      : <GraphEditor validationEndpoint="/api/editor/validate" catalog={catalog} />}
  </main>;
}
