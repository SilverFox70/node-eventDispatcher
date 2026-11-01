const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runCommand } = require('./package-fixture.cjs');

test('package process timeout preserves the subprocess cause and bounded budget', () => {
  assert.throws(() => runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], __dirname, 50), error => {
    assert.match(error.message, /ETIMEDOUT/);
    assert.match(error.message, /timeoutMs: 50/);
    assert.match(error.message, /status: null/);
    assert.match(error.message, /signal:/);
    assert.match(error.message, /Command failed:/);
    return true;
  });
});

test('package process nonzero exits retain status and captured output', () => {
  assert.throws(() => runCommand(process.execPath, ['-e', 'console.log("setup-out"); console.error("setup-error"); process.exit(7)'], __dirname), error => {
    assert.match(error.message, /status: 7/);
    assert.match(error.message, /setup-out/);
    assert.match(error.message, /setup-error/);
    return true;
  });
  assert.equal(runCommand(process.execPath, ['-e', 'process.stdout.write("setup-ok")'], __dirname), 'setup-ok');
});

test('package process launch errors distinguish missing executables from timeouts', () => {
  assert.throws(() => runCommand(__dirname + '/missing-package-executable', [], __dirname), error => {
    assert.match(error.message, /ENOENT/);
    assert.match(error.message, /status: null/);
    return true;
  });
});
