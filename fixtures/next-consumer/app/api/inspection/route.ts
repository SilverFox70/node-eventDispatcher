import { randomUUID } from 'node:crypto';
import { createInspectionFixture } from '../../../lib/inspection-fixture';
import { openInspectionStream } from '../../../lib/inspection-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return new Response(openInspectionStream(createInspectionFixture(), request.signal, randomUUID(), {
    leaseMs: process.env.FBP_INSPECTION_SHORT_LEASE === '1' ? 800 : 60000
  }), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' }
  });
}
