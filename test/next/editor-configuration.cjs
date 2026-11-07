const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function verifyConfigurationModel(app) {
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { applyEditorCommand, createEditorState } from 'event-driven-design-editor/model';
    import { specimenCatalog } from './lib/editor-catalog.ts';
    import { POST } from './app/api/editor/validate/route.ts';
    const path = new URL('./configuration/schema.js', import.meta.resolve('event-driven-design-editor/model'));
    const { fieldFor } = await import(path);
    for (const schema of [null, { type: 'array' }, { enum: [null] }, { enum: [] },
      { type: 'object', additionalProperties: false, properties: { credentials: { type: 'string' } } },
      { type: 'object', additionalProperties: false, properties: { serviceBindings: { type: 'string' } } },
      { type: 'object', additionalProperties: false, properties: { items: { type: 'array' } } }]) {
      assert.equal(fieldFor(schema), undefined);
    }
    assert.deepEqual(fieldFor({ enum: [3, true, 'text'] }), { kind: 'enum', values: [3, true, 'text'] });
    assert.deepEqual(fieldFor({ type: 'object', additionalProperties: false }), { kind: 'object', fields: [] });
    const state = createEditorState([
      { id: 'alert', component: 'inventory-alert@1' },
      { id: 'escaped', component: 'escaped@1' },
      { id: 'retired', component: 'retired@1' },
    ]);
    const apply = (node, config) => applyEditorCommand(state,
      { type: 'setConfig', node, config, id: 'config', expectedRevision: 0 }, specimenCatalog);
    assert.equal(apply('missing', 3).issue.code, 'UNKNOWN_NODE');
    assert.equal(apply('retired', 3).issue.code, 'CONFIG_INVALID');
    assert.equal(apply('escaped', 3).issue.code, 'CONFIG_INVALID');
    assert.equal(apply('alert', undefined).state, state);
    assert.deepEqual(apply('alert', { threshold: 2 }).state.document.graph.nodes[0].config, { threshold: 2 });
    const bad = await POST(new Request('http://localhost/api/editor/validate', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    }));
    assert.equal(bad.status, 400);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
}

function verifyConfigurationMarkup(app) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    const load = name => import(new URL(name, import.meta.resolve('event-driven-design-editor/model')));
    const { ConfigurationField } = await load('./configuration/fields.js');
    const { NodeDetails } = await load('./node-details.js');
    const { readIssues, validationView } = await load('./validation/verdict.js');
    const issue = { code: 'CONFIG_INVALID', path: '$.config' };
    const common = { name: 'settings', path: '$.config', change() {}, issues: [issue] };
    const field = (schema, value, props) => renderToStaticMarkup(createElement(ConfigurationField,
      { ...common, field: schema, value, ...props }));
    assert.match(field({ kind: 'object', fields: [] }, undefined, { root: true }), /Review the settings/);
    assert.match(field({ kind: 'string' }, 'warehouse'), /This setting is optional/);
    assert.match(field({ kind: 'boolean' }, false), /aria-invalid="true"/);
    const descriptor = { description: 'Example', in: { stock: { contractId: 'number@1', schema: { type: 'number' } } }, out: {} };
    const port = { code: 'PORT_CARDINALITY', path: '$.nodes[0].in["stock"]' };
    assert.match(renderToStaticMarkup(createElement(NodeDetails, { descriptor, path: '$.nodes[0]', issues: [port] })),
      /Connect or expose this port once/);
    for (const value of [null, 1, {}, { revision: 1 }, { revision: 1, issues: {} },
      { revision: 1, issues: [null] }, { revision: 1, issues: [{ code: 1, path: '$' }] },
      { revision: 1, issues: [{ code: 'INVALID' }] }, { revision: 2, issues: [] }]) {
      assert.throws(() => readIssues(value, 1), /INVALID_VERDICT/);
    }
    assert.deepEqual(readIssues({ revision: 1, issues: [issue] }, 1), [issue]);
    assert.match(validationView(undefined, 1).message, /^Validate the draft/);
    assert.match(validationView({ revision: 1, status: 'pending' }, 1).message, /pending/);
    assert.match(validationView({ revision: 1, status: 'failed' }, 1).message, /failed/);
    assert.match(validationView({ revision: 1, status: 'complete', issues: [] }, 1).message, /validated/);
    assert.match(validationView({ revision: 1, status: 'complete', issues: [issue] }, 1).message, /1 draft issue[.]/);
    assert.match(validationView({ revision: 1, status: 'complete', issues: [issue, issue] }, 1).message, /2 draft issues[.]/);
    assert.deepEqual(validationView({ revision: 1, status: 'complete', issues: [issue] }, 2).issues, []);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
}

async function verifyRoute(page, url) {
  const endpoint = url + '/api/editor/validate';
  const graph = { version: 2, nodes: [], edges: [], inputs: {}, outputs: {} };
  const post = async (value, status = 200) => {
    const response = await page.request.post(endpoint, { data: value });
    assert.equal(response.status(), status);
    return response.json();
  };
  assert.deepEqual(await post({ revision: 1, graph }), { revision: 1, issues: [] });
  for (const bad of [null, 0, {}, { revision: 1, extra: true }, { graph, extra: true }, { graph, revision: '1' },
    { graph, revision: 1.5 }, { graph, revision: -1 }]) await post(bad, 400);
  assert.equal((await page.request.post(endpoint, { data: '{' , headers: { 'content-type': 'application/json' } })).status(), 400);
  const submit = config => post({ revision: 2, graph: { ...graph, nodes: [
    { id: 'alert', component: 'inventory-alert@1', config },
  ] } });
  for (const value of [-1, '5']) assert((await submit({ threshold: value })).issues.some(issue =>
    issue.code === 'CONFIG_INVALID' && issue.path === '$.nodes[0].config["threshold"]'));
  assert((await submit({ threshold: 5, hidden: 'refuse' })).issues.some(issue => issue.code === 'CONFIG_INVALID'));
  for (const binding of [{ serviceBindings: {} }, { nested: { credentials: 'redacted' } }]) {
    assert.deepEqual((await submit({ threshold: 5, ...binding })).issues, [
      { code: 'HOST_BINDING_FORBIDDEN', path: '$.nodes[0].config' },
    ]);
  }
  assert.deepEqual((await post({ revision: 1, graph: null })).issues, [{ code: 'INVALID_GRAPH', path: '$' }]);
}

async function verifySettings(page, url) {
  await page.goto(url + '/editor');
  await page.getByText('Canvas controls', { exact: true }).press('Enter');
  await page.getByText('Use Select in the node list', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Validate draft' }).press('Enter');
  await page.getByText('Backend validated this draft.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add Inventory Alert', exact: true }).press('Enter');
  const settings = page.getByRole('region', { name: 'Node settings' });
  const threshold = settings.getByRole('spinbutton', { name: 'threshold' });
  const validate = page.getByRole('button', { name: 'Validate draft' });
  assert(await threshold.getAttribute('aria-describedby'));
  assert(await page.getByRole('region', { name: 'Graph canvas' }).getAttribute('aria-describedby'));
  await threshold.fill('-1');
  await validate.click();
  await settings.getByText('CONFIG_INVALID', { exact: false }).waitFor();
  assert.equal(await threshold.getAttribute('aria-invalid'), 'true');

  let release, observed;
  const waiting = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { observed = resolve; });
  let intercept = true, delivered;
  const oldDelivered = new Promise(resolve => { delivered = resolve; });
  await page.route('**/api/editor/validate', async route => {
    if (!intercept) return route.continue();
    intercept = false;
    try {
      const response = await route.fetch();
      observed();
      await waiting;
      await route.fulfill({ response });
    } finally { delivered(); }
  });
  try {
    await validate.click();
    await started;
    await page.getByText('Backend validation pending.', { exact: true }).waitFor();
    await threshold.fill('5');
    await page.getByText('Validation is stale', { exact: false }).waitFor();
    await validate.click();
    await page.getByText('Backend found 2 draft issues.', { exact: true }).waitFor();
    release();
    await oldDelivered;
    assert.equal(await threshold.getAttribute('aria-invalid'), null);
    assert.equal(await threshold.inputValue(), '5');
    await page.getByRole('region', { name: 'Selected node' }).getByText('Connect or expose this port once.', { exact: false }).first().waitFor();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(await threshold.inputValue(), '-1');
  } finally {
    release();
    await page.unroute('**/api/editor/validate');
  }
  await threshold.fill('');
  await settings.getByRole('button', { name: 'Clear settings' }).click();
  await validate.click();
  await settings.getByText('Review the settings in this group.', { exact: false }).waitFor();
  await page.route('**/api/editor/validate', route => route.fulfill({ status: 502 }));
  await validate.click();
  await page.getByText('Backend validation failed.', { exact: false }).waitFor();
  await page.unroute('**/api/editor/validate');
  await page.route('**/api/editor/validate', route => route.fulfill({ json: { revision: -1, issues: [] } }));
  await validate.click();
  await page.getByText('Backend validation failed.', { exact: false }).waitFor();
  await page.unroute('**/api/editor/validate');
}

async function verifySpecimens(page, url) {
  await page.goto(url + '/editor?specimens=1');
  await page.getByRole('button', { name: 'Add Settings example' }).click();
  const settings = page.getByRole('region', { name: 'Node settings' });
  await settings.getByRole('combobox', { name: 'mode' }).selectOption({ label: 'record' });
  await settings.getByRole('textbox', { name: 'label' }).fill('Warehouse');
  const enabled = settings.getByRole('combobox', { name: 'enabled' });
  await enabled.selectOption({ label: 'False' });
  await settings.getByRole('button', { name: 'Add optional' }).click();
  const count = settings.getByRole('spinbutton', { name: 'count' });
  await count.fill('2');
  await page.getByRole('button', { name: 'Validate draft' }).click();
  await page.getByText('Backend found 1 draft issue.', { exact: true }).waitFor();
  await settings.getByRole('button', { name: 'Remove optional' }).click();
  await enabled.selectOption({ label: 'True' });
  await enabled.selectOption({ label: 'Choose a value' });
  await settings.getByRole('combobox', { name: 'mode' }).selectOption({ label: 'Choose a value' });
  await page.getByRole('button', { name: 'Add List settings' }).click();
  await settings.getByText('These settings use a schema the editor cannot edit.').waitFor();
}

module.exports = { verifyConfigurationMarkup, verifyConfigurationModel, verifyRoute, verifySettings, verifySpecimens };
