const { cpus, totalmem, platform, arch } = require('node:os');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { measure } = require('./flow-fixture.cjs');
async function main() {
  console.log(JSON.stringify({ node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    fixtureSha256: createHash('sha256').update(readFileSync(join(__dirname, 'flow-fixture.cjs'))).digest('hex'),
    runnerSha256: createHash('sha256').update(readFileSync(join(__dirname, 'throughput.cjs'))).digest('hex'),
    platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemory: totalmem(),
    instrumentation: 'real channel wrappers; sampled heap, no forced GC; observations, not speed or memory guarantees' }));
  for (const kind of ['pipeline', 'fork-join']) {
    for (const capacity of [1, 16]) console.log(JSON.stringify(await measure(kind, 100000, capacity)));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
