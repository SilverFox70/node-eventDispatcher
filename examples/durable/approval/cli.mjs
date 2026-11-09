import { openPostgresStore } from 'event-driven-design-durable/postgres';
import { resumeApproval, stageApproval } from './host.mjs';

const [action, id] = process.argv.slice(2);
const database = process.env.FBP_APPROVAL_DATABASE_URL;
if (!database || !id || !['stage', 'approve'].includes(action)) {
  throw Error('Set FBP_APPROVAL_DATABASE_URL and use cli.mjs stage <job-id> or approve <run-id>');
}
const store = openPostgresStore(database);
try {
  await store.migrate();
  const result = action === 'stage' ? await stageApproval(store, id) : await resumeApproval(store, id);
  console.log(JSON.stringify(result));
} finally { await store.close(); }
