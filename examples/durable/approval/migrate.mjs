import { openPostgresStore } from 'event-driven-design-durable/postgres';

if (!process.env.FBP_APPROVAL_DATABASE_URL) throw Error('Set FBP_APPROVAL_DATABASE_URL');
const store = openPostgresStore(process.env.FBP_APPROVAL_DATABASE_URL);
try { await store.migrate(); }
finally { await store.close(); }
