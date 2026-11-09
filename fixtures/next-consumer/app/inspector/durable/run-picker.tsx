'use client';

import { useState } from 'react';
import { DurableRunInspector } from 'event-driven-design-editor';
import type { DurableRunInspectorProps } from 'event-driven-design-editor';

type Run = { slug: string; title: string; origin: DurableRunInspectorProps['origin'] };

export function RunPicker({ runs }: { runs: readonly Run[] }) {
  const [index, select] = useState(0);
  const run = runs[index]!;
  return <>
    <label>Durable run <select value={index} onChange={event => select(Number(event.target.value))}>
      {runs.map(({ slug, title }, i) => <option key={slug} value={i}>{title}</option>)}
    </select></label>
    <DurableRunInspector key={run.slug} endpoint={'/api/durable/' + run.slug} origin={run.origin} />
  </>;
}
