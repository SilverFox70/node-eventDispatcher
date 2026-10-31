const { setImmediate } = require('node:timers/promises');
const { z } = require('zod');
const {
  contract, map, broadcast, joinByKey, defineComponent,
  createGraph, compileGraph, startNetwork, packet,
} = require('event-driven-design');

// Local async stand-ins: these do not write to a database or call a service.
async function saveProfile(profile, { signal }) {
  await setImmediate(undefined, { signal });
  return { name: profile.name, profileId: 'local-profile-1' };
}

async function saveSettings(settings, { signal }) {
  await setImmediate(undefined, { signal });
  return { theme: settings.theme };
}

async function main() {
  const request = contract('demo-signup@1', z.strictObject({
    profile: z.strictObject({ name: z.string() }),
    settings: z.strictObject({ theme: z.string() }),
  }));
  const profileResult = contract('demo-profile-result@1', z.strictObject({
    name: z.string(), profileId: z.string(),
  }));
  const settingsResult = contract('demo-settings-result@1', z.strictObject({ theme: z.string() }));

  const split = broadcast(request, ['profile', 'settings']);
  const profile = defineComponent({
    ...map(request, profileResult, (value, context) => saveProfile(value.profile, context)),
    id: 'save-profile', title: 'Save profile',
  });
  const settings = defineComponent({
    ...map(request, settingsResult, (value, context) => saveSettings(value.settings, context)),
    id: 'save-settings', title: 'Save settings',
  });
  const results = joinByKey({ profile: profileResult, settings: settingsResult }, {
    outputId: 'demo-signup-result@1', maxKeys: 32,
  });
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
      console.log('Job:', p.jobId, 'Key:', p.key);
      console.log('Collated:', JSON.stringify(p.value));
      console.log('Immediate parents:', p.parentPacketIds.length);
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
