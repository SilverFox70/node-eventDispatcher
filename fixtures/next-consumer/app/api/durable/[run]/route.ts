import type { NextRequest } from 'next/server';
import { demoDurableFixture, demoDurableStore } from '../../../../lib/durable/fixture';
import { applyDemoAction } from '../../../../lib/durable/actions';

type Route = { params: Promise<{ run: string }> };

function locate(request: NextRequest, slug: string) {
  const fixture = demoDurableFixture();
  if (!fixture || request.cookies.get('durable-demo')?.value !== fixture.token) return undefined;
  const run = fixture.runs.find(item => item.slug === slug && item.workspaceId === 'demo-workspace');
  if (run) return { run, fixture, store: demoDurableStore(fixture.database) };
}

const absent = () => Response.json({ code: 'RUN_NOT_FOUND' }, { status: 404 });
const invalid = () => Response.json({ code: 'INVALID_PROGRESS_REQUEST' }, { status: 400 });

const refusals = new Map([
  ['INVALID_PROGRESS_PAGE', 400], ['RUN_NOT_FOUND', 404], ['EXTERNAL_OPERATION_NOT_FOUND', 404],
  ['PROGRESS_CONFLICT', 409], ['SIGNAL_CONFLICT', 409], ['STALE_RECONCILIATION', 409],
  ['ALREADY_RESOLVED', 409], ['DUPLICATE_RESOLUTION', 409], ['EXTERNAL_OPERATION_HELD', 409], ['RUN_TERMINATED', 409],
]);

function refused(error: unknown) {
  // Match documented codes across the bundled route and the external durable package.
  const code = (error as { code?: string })?.code ?? '';
  const status = refusals.get(code);
  if (status === 404) return absent();
  if (status === 400) return invalid();
  return status === 409 ? Response.json({ code }, { status }) :
    Response.json({ code: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
}

export async function GET(request: NextRequest, { params }: Route) {
  const target = locate(request, (await params).run);
  if (!target) return absent();
  const after = request.nextUrl.searchParams.get('after');
  try {
    return Response.json(await target.store.queryRun(target.run, {
      actorId: 'fixture-operator', limit: 1, ...(after !== null && { after }),
    }, () => true), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return refused(error); }
}

export async function POST(request: NextRequest, { params }: Route) {
  const target = locate(request, (await params).run);
  if (!target) return absent();
  if (request.headers.get('origin') !== request.nextUrl.protocol + '//' + request.headers.get('host')) return absent();
  try {
    if (!await applyDemoAction(target.store, target.run, target.fixture.providerUrl, await request.json().catch(() => null))) return invalid();
    return Response.json({ status: 'recorded' });
  } catch (error) { return refused(error); }
}
