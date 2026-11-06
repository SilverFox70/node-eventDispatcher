import { useRef, useState } from 'react';
import type { GraphSpecV2 } from 'event-driven-design/model';
import { readIssues, validationView } from './verdict.js';
import type { Verdict } from './verdict.js';

/** Attribute every verdict to the request and draft revision that produced it. */
export function useValidation(graph: GraphSpecV2, revision: number) {
  const latest = useRef(0);
  const [verdict, setVerdict] = useState<Verdict>();
  async function validate(endpoint: string) {
    const sequence = ++latest.current;
    const receive = (next: Verdict) => { if (sequence === latest.current) setVerdict(next); };
    setVerdict({ revision, status: 'pending' });
    try {
      const response = await globalThis.fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ graph, revision }),
      });
      if (!response.ok) throw Error('VALIDATION_FAILED');
      receive({ revision, status: 'complete', issues: readIssues(await response.json(), revision) });
    } catch {
      receive({ revision, status: 'failed' });
    }
  }
  return { validate, ...validationView(verdict, revision) };
}
