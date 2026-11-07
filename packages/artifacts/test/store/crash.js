import { writeSync } from 'node:fs';
import { openDraftDatabase } from '../../dist/store/database.js';

const db = openDraftDatabase(process.argv[2]);
const scope = { workspaceId: 'a', documentId: 'draft' };
const loaded = db.execute({ kind: 'load', scope });
db.execute({ kind: 'save', scope, expectedRevision: 0,
  content: { ...loaded.draft.document, layout: { positions: {}, groups: {}, viewport: { x: 3, y: 4, zoom: 1 } } },
}, () => {
  writeSync(1, 'UNCOMMITTED\n');
  // Keep the mutation inside the real transaction until the parent kills the process.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
});
