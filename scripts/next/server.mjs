import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { environment } from './process.mjs';

/** A child production server, owned until finally/stop. Next reports its requested or ephemeral port. */
export async function startServer(directory, { host = '127.0.0.1', port = 0, mode = 'success', badCatalog = false, shortInspectionLease = false, badInspection = false, coverage, log } = {}) {
  const child = spawn(process.execPath, [join(directory, 'node_modules/next/dist/bin/next'), 'start', '-H', host, '-p', String(port)], {
    cwd: directory, env: environment({ FBP_DEMO_MODE: mode, FBP_DEMO_BAD_CATALOG: badCatalog ? '1' : '0',
      FBP_INSPECTION_SHORT_LEASE: shortInspectionLease ? '1' : '0',
      FBP_INSPECTION_BAD_GRAPH: badInspection ? '1' : '0',
      ...(coverage ? { NODE_V8_COVERAGE: coverage } : {}) }), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const exited = new Promise(resolve => child.once('exit', resolve));
  let stopPromise;
  const stop = () => stopPromise ??= (async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    const force = globalThis.setTimeout(() => child.kill('SIGKILL'), 10000);
    await exited; globalThis.clearTimeout(force);
    if (log) writeFileSync(log, output);
  })();
  try {
    const url = await new Promise((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => reject(Error('Next startup timed out: ' + output)), 30000);
      const done = () => globalThis.clearTimeout(timeout);
      const capture = data => {
        output = (output + data.toString()).slice(-131072);
        const match = output.match(/http:\/\/(?:127\.0\.0\.1|localhost):(\d+)/);
        if (match && Number(match[1]) > 0 && output.includes('Ready')) { done(); resolve(`http://${host}:${match[1]}`); }
      };
      child.stdout.on('data', capture); child.stderr.on('data', capture);
      child.once('error', error => { done(); reject(error); });
      child.once('exit', () => { done(); reject(Error(output.includes('EADDRINUSE') ? `Port ${port} is already in use; choose --port <number>.` : 'Next exited before startup: ' + output)); });
    });
    return { url, stop, logs: () => output, child };
  } catch (error) { await stop(); throw error; }
}
