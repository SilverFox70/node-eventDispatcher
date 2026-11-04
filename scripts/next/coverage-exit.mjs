import { takeCoverage, stopCoverage } from 'node:v8';

// Stop after flushing so automatic exit coverage cannot overwrite the same timestamped report.
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => { takeCoverage(); stopCoverage(); process.exit(code); });
}
