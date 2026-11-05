import type { DiagnosticControls } from './diagnostic-connection.ts';

/** Explicit user export, with a short-lived browser URL owned by this action. */
export async function downloadDiagnostics(controls: DiagnosticControls, includeCaptures: boolean): Promise<void> {
  const text = await controls.command({ action: 'export', includeCaptures });
  if (text === null) return;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' }));
  try {
    const link = document.createElement('a'); link.href = url; link.download = 'nodeflow-diagnostics.jsonl'; link.click();
  } finally { URL.revokeObjectURL(url); }
}
