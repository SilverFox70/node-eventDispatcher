import Demo from './demo';
import { graphSpec, catalog } from '../lib/registry';

export const dynamic = 'force-dynamic';

export default function Page() {
  const displayed = process.env.FBP_DEMO_BAD_CATALOG === '1' ? { ...catalog, version: 99 } : catalog;
  return <main><h1>NodeDispatcher in Next.js</h1><p>A packaged flow running on the server.</p><Demo spec={graphSpec} catalog={displayed as typeof catalog} /></main>;
}
