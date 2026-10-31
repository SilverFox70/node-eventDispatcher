const { setImmediate } = require('node:timers/promises');
const { z } = require('zod');
const {
  contract, map, broadcast, merge, defineComponent,
  createGraph, compileGraph, startNetwork, packet,
} = require('../dist/cjs');

// Local async stand-ins: these do not write to a database or call a service.
async function saveProfile(profile, { signal }) {
  await setImmediate(undefined, { signal });
  return { repository: 'profiles', summary: `Saved ${profile.name}` };
}

async function saveSettings(settings, { signal }) {
  await setImmediate(undefined, { signal });
  return { repository: 'settings', summary: `Saved ${settings.theme}` };
}

async function main() {
  const request = contract('demo-signup@1', z.strictObject({
    profile: z.strictObject({ name: z.string() }),
    settings: z.strictObject({ theme: z.string() }),
  }));
  const result = contract('demo-save-result@1', z.strictObject({
    repository: z.string(), summary: z.string(),
  }));

  const split = broadcast(request, ['profile', 'settings']);
  const profile = defineComponent({
    ...map(request, result, (value, context) => saveProfile(value.profile, context)),
    id: 'save-profile', title: 'Save profile',
  });
  const settings = defineComponent({
    ...map(request, result, (value, context) => saveSettings(value.settings, context)),
    id: 'save-settings', title: 'Save settings',
  });
  const results = merge(result, ['profile', 'settings']);
  const graph = createGraph();
  const fork = graph.add('split', split);
  const a = graph.add('profile', profile, { taskTimeoutMs: 1000 });
  const b = graph.add('settings', settings, { taskTimeoutMs: 1000 });
  const fanIn = graph.add('results', results);

  graph.connect(fork, 'profile', a, 'in', 1);
  graph.connect(fork, 'settings', b, 'in', 1);
  graph.connect(a, 'out', fanIn, 'profile', 1);
  graph.connect(b, 'out', fanIn, 'settings', 1);
  graph.exposeInput('signup', fork, 'in');
  graph.exposeOutput('results', fanIn, 'out');

  const registry = Object.fromEntries(
    [split, profile, settings, results].map(node => [`${node.id}@1`, node]),
  );
  const compiled = compileGraph(graph.toSpec(), registry);
  if (!compiled.ok) throw Error(JSON.stringify(compiled.issues));
  const run = startNetwork(compiled.graph, { timeoutMs: 5000 });
  const output = (async () => {
    const values = [];
    for await (const p of run.outputs.results) {
      values.push(p.value);
      console.log(`${p.jobId}: ${p.value.repository} → ${p.value.summary}`);
    }
    return values;
  })();

  await run.send('signup', packet({
    profile: { name: 'Ada' }, settings: { theme: 'dark' },
  }, { jobId: 'demo-signup-42', key: 'account-123@v1' }));
  const terminal = await run.finish();
  console.log('Results received:', (await output).length);
  console.log('Run:', terminal.status);
  if (terminal.status !== 'completed') throw Error(terminal.code);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
