import { z } from 'zod';

export type Product = {
  slug: string;
  title: string;
  description: string;
  altText: string;
  archived: boolean;
};
const finding = z.strictObject({ field: z.string(), message: z.string() });
const findingsSchema = z.array(finding);
type Finding = z.infer<typeof finding>;
type MediaService = (product: Product, signal: AbortSignal, attempt: number) => Promise<Finding[]>;
type Report = { findings: Finding[]; preview: { title: string; description: string } | null };
type Terminal = { status: 'completed' } | { status: 'failed' | 'cancelled'; code: string };
type Event = { stage: string; outcome: string };
class ReviewFailure extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function checkContent(product: Product): Finding[] {
  const findings: Finding[] = [];
  if (!product.title.trim()) findings.push({ field: 'title', message: 'Add a product title.' });
  if (!product.description.trim()) findings.push({ field: 'description', message: 'Add a product description.' });
  return findings;
}

export function checkRules(product: Product): Finding[] {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)
    ? [] : [{ field: 'slug', message: 'Use lowercase words separated by hyphens.' }];
}

async function checkMedia(product: Product, media: MediaService, signal: AbortSignal, events: Event[]): Promise<Finding[]> {
  async function attempt(number: number) {
    const timeout = new AbortController();
    const combined = AbortSignal.any([signal, timeout.signal]);
    const timer = setTimeout(() => timeout.abort(new ReviewFailure('NODE_TIMEOUT')), 900);
    let abort!: () => void;
    const cancelled = new Promise<never>((_resolve, reject) => {
      abort = () => reject(combined.reason);
      combined.addEventListener('abort', abort, { once: true });
    });
    try {
      combined.throwIfAborted();
      const result = await Promise.race([media(product, combined, number), cancelled]);
      const validated = findingsSchema.safeParse(result);
      if (!validated.success) throw new ReviewFailure('OUTPUT_CONTRACT');
      events.push({ stage: 'media', outcome: 'completed' });
      return validated.data;
    } finally {
      clearTimeout(timer);
      combined.removeEventListener('abort', abort);
    }
  }
  try {
    return await attempt(1);
  } catch (error) {
    if (signal.aborted || !(error instanceof Error) || !('code' in error) || error.code !== 'MEDIA_TEMPORARY') throw error;
    events.push({ stage: 'media', outcome: 'MEDIA_TEMPORARY' });
    return attempt(2);
  }
}

export async function plainReview(product: Product, media: MediaService, signal: AbortSignal) {
  const events: Event[] = [];
  const finish = (terminal: Terminal, review: Report | null = null) => ({ terminal, review, events });
  if (signal.aborted) return finish({ status: 'cancelled', code: 'CANCELLED' });
  if (product.archived) {
    events.push({ stage: 'eligibility', outcome: 'ARCHIVED' });
    return finish({ status: 'completed' });
  }
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(new ReviewFailure('TIMEOUT')), 3000);
  const runSignal = AbortSignal.any([signal, deadline.signal]);
  try {
    const [content, image, rules] = await Promise.all([
      Promise.resolve().then(() => {
        const findings = checkContent(product);
        events.push({ stage: 'content', outcome: findings.length ? 'findings' : 'passed' });
        return findings;
      }),
      checkMedia(product, media, runSignal, events),
      Promise.resolve().then(() => {
        const findings = checkRules(product);
        events.push({ stage: 'rules', outcome: findings.length ? 'findings' : 'passed' });
        return findings;
      }),
    ]);
    const findings = [...content, ...image, ...rules];
    events.push({ stage: 'report', outcome: findings.length ? 'findings' : 'preview' });
    return finish({ status: 'completed' }, {
      findings,
      preview: findings.length ? null : { title: product.title, description: product.description },
    });
  } catch (error) {
    if (signal.aborted) return finish({ status: 'cancelled', code: 'CANCELLED' });
    const code = error instanceof ReviewFailure ? error.code : 'COMPONENT_FAILED';
    events.push({ stage: 'media', outcome: code });
    return finish({ status: 'failed', code });
  } finally {
    clearTimeout(timer);
  }
}
