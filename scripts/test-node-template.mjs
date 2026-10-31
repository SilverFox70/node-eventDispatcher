import helper from '../test/node-template-fixture.cjs';

const fixture = helper.buildTemplate();
try {
  const result = fixture.build.status === 0 ? fixture.test() : fixture.build;
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} finally {
  fixture.dispose();
}
