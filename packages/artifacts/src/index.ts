import { createHash } from 'node:crypto';
import { fingerprintPreimages } from './model/index.js';

export * from './model/index.js';

/** SHA-256 of each versioned UTF-8 preimage. Layout edits leave the semantic hash intact. */
export function fingerprintGraphDocument(value: unknown) {
  const { semantic, layout } = fingerprintPreimages(value);
  const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
  return { semanticHash: sha256(semantic), layoutHash: sha256(layout) };
}
