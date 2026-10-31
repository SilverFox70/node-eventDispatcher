import { label } from './labels.js';
export type Diagram = Readonly<{ vertex(text: string): string; edge(from: string, to: string, kind: 'defined' | 'declared' | 'active'): void }>;
/** All code identifiers are generated; application identifiers appear only inside escaped labels. */
export function writer(lines: string[], prefix: string): Diagram {
  let next = 0;
  return {
    vertex(text) { const id = `${prefix}_v${next++}`; lines.push(`    ${id}["${label(text)}"]`); return id; },
    edge(from, to, kind) { lines.push(`    ${from} -->|${kind}| ${to}`); }
  };
}
