import { takeCoverage } from 'node:v8';

// Next interrupts disposable build workers. Flush their executed ranges before signal exit.
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => { takeCoverage(); process.exit(code); });
}
