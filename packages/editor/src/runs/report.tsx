import type { RunResult } from './protocol.js';

export function RunReport({ issue, result, revision }: {
  issue: string | undefined; result: RunResult | undefined; revision: number;
}) {
  return <>
    {issue && <p role="alert">{issue}</p>}
    {result && <div className="nodeflow-run-result" aria-label="Test result" role="region">
      <p>Test {result.terminal.status}{result.terminal.code && ` · ${result.terminal.code}`} · draft revision {result.revision}</p>
      {result.revision !== revision && <p>These results belong to an earlier draft.</p>}
      <p>Run {result.runId}</p>
      <p>Graph <code>{result.graphHash}</code></p>
      {Object.entries(result.outputs).map(([name, packets]) => <details key={name} open>
        <summary>{name} · {packets.length} packets</summary>
        <pre>{JSON.stringify(packets, null, 2)}</pre>
      </details>)}
    </div>}
  </>;
}
