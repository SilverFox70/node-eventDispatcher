import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Check each mapped production file, including files never imported by tests. */
export function coverageFailures(report, minimum = 95) {
  const failures = [];
  if (Object.keys(report).length === 0) failures.push('No production coverage was collected');
  for (const [file, data] of Object.entries(report)) {
    const statements = Object.values(data.s);
    const branches = Object.values(data.b).flat();
    const lines = new Map();
    for (const [id, location] of Object.entries(data.statementMap)) {
      const line = location.start.line;
      lines.set(line, Math.max(lines.get(line) ?? 0, data.s[id]));
    }
    for (const [metric, hits] of [['statements', statements], ['lines', [...lines.values()]], ['branches', branches]]) {
      const percent = hits.length === 0 ? 100 : 100 * hits.filter(hit => hit > 0).length / hits.length;
      if (percent < minimum) failures.push(`${file}: ${metric} ${percent.toFixed(2)}% < ${minimum}%`);
    }
  }
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = coverageFailures(JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8')));
  for (const failure of failures) console.error(failure);
  process.exitCode = failures.length ? 1 : 0;
}
