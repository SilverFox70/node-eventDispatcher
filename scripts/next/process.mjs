import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const environment = (extra = {}) => {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...extra };
  delete env.NODE_TEST_CONTEXT;
  if (!Object.hasOwn(extra, 'NODE_V8_COVERAGE')) delete env.NODE_V8_COVERAGE;
  return env;
};
export function command(file, args, { cwd, env = {}, log, timeoutMs = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd, env: environment(env), stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let output = '';
    const capture = data => { output = (output + data).slice(-4000000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    const timer = globalThis.setTimeout(() => {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid, 'SIGKILL');
    }, timeoutMs);
    child.once('error', error => { globalThis.clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      globalThis.clearTimeout(timer);
      if (log) writeFileSync(log, output);
      resolve({ code, signal, output });
    });
  });
}
export function npmCommand(args, options) {
  if (!process.env.npm_execpath) throw Error('Run this fixture through its npm script so the npm CLI path is explicit.');
  return command(process.execPath, [process.env.npm_execpath, ...args], options);
}
