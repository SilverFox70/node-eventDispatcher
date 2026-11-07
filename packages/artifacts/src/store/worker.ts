import { parentPort, workerData } from 'node:worker_threads';
import { openDraftDatabase } from './database.js';
import type { Command } from './index.js';

const port = parentPort!;
const database = openDraftDatabase(workerData as string);
port.on('message', ({ id, command }: { id: number; command: Command | 'close' }) => {
  try {
    if (command === 'close') {
      database.close();
      port.postMessage({ id });
      port.close();
    } else {
      port.postMessage({ id, result: database.execute(command) });
    }
  } catch (error) {
    port.postMessage({ id, error: String(error).replace(/^Error: /, '') });
  }
});
