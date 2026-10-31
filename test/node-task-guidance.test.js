const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { join, dirname, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

test('guidance preserves stable base IDs and validates ordered insertions', () => {
  const root = resolve(__dirname, '..'), fixture = fs.mkdtempSync(join(tmpdir(), 'nt-guidance-'));
  try {
    const files = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
    assert.equal(files.status, 0);
    for (const file of files.stdout.trim().split('\n')) {
      if (file.startsWith('.feedback-log/') || file === '.DS_Store') continue;
      const target = join(fixture, file); fs.mkdirSync(dirname(target), { recursive: true }); fs.copyFileSync(join(root, file), target);
    }
    const manifestPath = join(fixture, 'docs/cursor_plans/fbp-slices/manifest.json');
    const original = fs.readFileSync(manifestPath, 'utf8');
    const run = () => spawnSync(process.execPath, [join(fixture, 'scripts/check-agent-guidance.mjs'), '--root', fixture], { encoding: 'utf8' });
    const baseline = run(); assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
    for (const [mutate, message] of [
      [m => { m.slices[10].id = 'S09C'; }, 'Invalid insertion order'],
      [m => { m.slices[11].id = 'S09A'; }, 'Duplicate slice ID'],
      [m => { m.slices[12].previous = 'S09'; }, 'Wrong predecessor'],
      [m => { m.slices[12].id = 'S11'; }, 'Skipped/reordered base slice'],
      [m => { m.slices[11].order = 99; }, 'Invalid slice order/ID'],
    ]) {
      const manifest = JSON.parse(original); mutate(manifest); fs.writeFileSync(manifestPath, JSON.stringify(manifest));
      const result = run(); assert.equal(result.status, 1); assert(result.stderr.includes(message), result.stderr);
    }
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
