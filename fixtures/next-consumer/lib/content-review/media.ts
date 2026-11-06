import { setTimeout as delay } from 'node:timers/promises';
import { FlowError } from 'event-driven-design';
import type { MediaService } from './nodes.ts';

export type MediaMode = 'normal' | 'slow' | 'retry' | 'invalid';

export function demoMedia(mode: MediaMode): MediaService {
  return async (product, signal, attempt) => {
    if (mode === 'slow') await delay(600, undefined, { signal });
    if (mode === 'retry' && attempt === 1) throw new FlowError('MEDIA_TEMPORARY');
    if (mode === 'invalid') return [{ field: 'altText', message: 42 }] as never;
    return product.altText.trim() ? [] : [{ field: 'altText', message: 'Describe the product image.' }];
  };
}
