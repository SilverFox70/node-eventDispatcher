import { readBoundedJson } from '../../../lib/read-json.ts';
import { demoMedia } from '../../../lib/content-review/media.ts';
import type { MediaMode } from '../../../lib/content-review/media.ts';
import { reviewInput } from '../../../lib/content-review/run.ts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get('media') ?? 'normal';
  if (!['normal', 'slow', 'retry', 'invalid'].includes(mode)) return Response.json({ issues: [{ field: 'media', code: 'invalid_mode' }] }, { status: 400 });
  let input: unknown;
  try { input = await readBoundedJson(request, 4096); }
  catch { return Response.json({ issues: [{ field: 'product', code: 'invalid_json' }] }, { status: 400 }); }
  const review = await reviewInput(input, demoMedia(mode as MediaMode), request.signal);
  if (!review.ok) return Response.json({ issues: review.issues }, { status: 400 });
  return Response.json(review.result, { headers: { 'cache-control': 'no-store' } });
}
