import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';
import { assertPreparedFixture } from './prepare.js';

/** Write only within the caller's selected directory, using a validated case name. */
export async function writeRegressionTest(directory: string, fixture: RegressionFixture): Promise<string> {
  assertPreparedFixture(fixture);
  const path = join(directory, fixture.caseId + '.test.mjs');
  const data = JSON.stringify(JSON.stringify(fixture));
  const source = `import { test } from 'node:test';
import { runRegressionFixture } from 'event-driven-design/testing';

test(${JSON.stringify(fixture.caseId)}, async () => {
  if (process.permission?.has('net') !== false) throw Error('Run this fixture with Node network permission disabled');
  const { fixtureBindings } = await import('./fixture-bindings.mjs');
  await runRegressionFixture(JSON.parse(${data}), fixtureBindings);
});
`;
  await writeFile(path, source, { flag: 'wx', mode: 0o600 });
  return path;
}
