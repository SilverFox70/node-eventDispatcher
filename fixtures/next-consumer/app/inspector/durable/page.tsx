import Link from 'next/link';
import { cookies } from 'next/headers';
import { demoDurableFixture } from '../../../lib/durable/fixture';
import { RunPicker } from './run-picker';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const fixture = demoDurableFixture();
  const token = (await cookies()).get('durable-demo')?.value;
  const visible = fixture?.token === token ? fixture?.runs.filter(run => run.workspaceId === 'demo-workspace') : undefined;
  return <main><h1>Durable workflow inspector</h1>
    <p><Link href="/inspector">Graph and execution inspector</Link></p>
    {visible?.length
      ? <RunPicker runs={visible.map(({ slug, title, origin }) => ({ slug, title, origin }))} />
      : <p>No durable runs are connected.</p>}
  </main>;
}
