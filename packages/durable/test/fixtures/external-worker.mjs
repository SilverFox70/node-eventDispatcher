import { openPostgresStore } from '../../dist/postgres/index.js';

process.on('message', async ({ url, scope, claim, operationId, request, endpoint }) => {
  const store = openPostgresStore(url);
  try {
    const result = await store.invokeExternalOperation(scope, claim, operationId, request, async payload => {
      const response = await globalThis.fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (!response.ok) throw Error('PROVIDER_REFUSED');
      return response.json();
    });
    process.send(result);
  } catch (error) { process.send({ code: error.code ?? error.message }); }
  finally { await store.close(); }
});
