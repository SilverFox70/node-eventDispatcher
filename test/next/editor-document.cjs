const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

/** Exercise the public model exported by the installed editor and its actual core peer. */
module.exports = function proveDocument(app) {
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createHash } from 'node:crypto';
    import { applyEditorCommand, copySelection, createEditorState, draftIssues } from 'event-driven-design-editor/model';
    import { specimenCatalog as catalog } from './lib/editor-catalog.ts';
    const alert = 'inventory-alert@1';
    const a = { id: 'a', component: alert }, b = { id: 'b', component: alert };
    const c = { id: 'c', component: 'escaped@1' };
    const port = (node, port) => ({ node, port });
    const wire = { from: port('a', 'alert'), to: port('b', 'stock'), capacity: 16 };
    const reverse = { from: port('b', 'alert'), to: port('a', 'stock') };
    const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    let state = createEditorState();
    assert.deepEqual(draftIssues(state.document.graph, catalog), []);
    let sequence = 0;
    const apply = (edit, expectedRevision = state.revision) => applyEditorCommand(state,
      { ...edit, expectedRevision, id: 'command-' + (++sequence) }, catalog);
    function accept(edit) {
      const result = apply(edit);
      assert(result.ok, JSON.stringify(result.issue));
      state = result.state;
    }
    function refuse(edit, code, revision) {
      const result = apply(edit, revision);
      assert.equal(result.ok, false);
      assert.equal(result.issue.code, code);
      assert.equal(result.state, state);
    }
    assert.equal(applyEditorCommand(state, { type: 'undo', expectedRevision: 0, id: '' }, catalog).issue.code, 'INVALID_COMMAND');
    refuse({ type: 'undo' }, 'EMPTY_HISTORY');
    refuse({ type: 'redo' }, 'EMPTY_HISTORY');
    refuse({ type: 'addNode', node: a }, 'STALE_REVISION', 9);
    refuse({ type: 'addNode', node: { id: 'bad', component: 'absent@1' } }, 'UNKNOWN_COMPONENT');
    accept({ type: 'addNode', node: a });
    accept({ type: 'addNode', node: b });
    accept({ type: 'addNode', node: c });
    refuse({ type: 'addNode', node: a }, 'DUPLICATE_ID');
    assert(draftIssues(state.document.graph, catalog).some(issue => issue.code === 'CONFIG_INVALID'));
    refuse({ type: 'moveNode', node: 'absent', position: { x: 0, y: 0 } }, 'UNKNOWN_NODE');
    refuse({ type: 'moveNode', node: 'a', position: { x: NaN, y: 0 } }, 'INVALID_POSITION');
    const unchanged = state;
    accept({ type: 'moveNode', node: 'a', position: state.document.layout.positions.a });
    assert.equal(state, unchanged);

    refuse({ type: 'connect', wire: { ...wire, capacity: 257 } }, 'INVALID_CAPACITY');
    refuse({ type: 'connect', wire: { from: port('c', 'sample'), to: wire.to } }, 'CONTRACT_MISMATCH');
    refuse({ type: 'connect', wire: { from: port('c', 'absent'), to: wire.to } }, 'UNKNOWN_PORT');
    accept({ type: 'connect', wire });
    refuse({ type: 'connect', wire: reverse }, 'CYCLE');
    refuse({ type: 'connect', wire }, 'PORT_CARDINALITY');
    const connected = state.document;
    const connectionEdit = state.past.at(-1);
    accept({ type: 'undo' });
    assert.deepEqual(state.document.graph.edges, []);
    assert.equal(state.future.at(-1), connectionEdit);
    accept({ type: 'redo' });
    assert.deepEqual(state.document, connected);
    assert.equal(state.past.at(-1), connectionEdit);
    accept({ type: 'moveNode', node: 'a', position: { x: 90, y: 70 } });
    assert.equal(hash(state.document.graph), hash(connected.graph));
    assert.notEqual(hash(state.document.layout), hash(connected.layout));
    assert.deepEqual(state.document.layout.positions.b, connected.layout.positions.b);

    refuse({ type: 'exposeInput', name: '', endpoint: port('a', 'stock') }, 'INVALID_NAME');
    refuse({ type: 'exposeInput', name: 'occupied', endpoint: wire.to }, 'PORT_CARDINALITY');
    refuse({ type: 'exposeInput', name: 'wrong', endpoint: port('a', 'missing') }, 'UNKNOWN_PORT');
    accept({ type: 'exposeInput', name: 'stock', endpoint: port('a', 'stock') });
    accept({ type: 'exposeOutput', name: 'alert', endpoint: port('b', 'alert') });
    refuse({ type: 'unexposeOutput', name: 'absent' }, 'UNKNOWN_PORT');
    refuse({ type: 'group', name: '', nodes: ['a'] }, 'INVALID_NAME');
    refuse({ type: 'group', name: 'none', nodes: [] }, 'UNKNOWN_NODE');
    refuse({ type: 'group', name: 'missing', nodes: ['absent'] }, 'UNKNOWN_NODE');
    refuse({ type: 'ungroup', name: 'absent' }, 'UNKNOWN_GROUP');
    accept({ type: 'group', name: 'pair', nodes: ['a', 'b'] });
    accept({ type: 'group', name: 'one', nodes: ['a'] });
    const beforeRemoval = state.document;
    refuse({ type: 'removeNode', node: 'absent' }, 'UNKNOWN_NODE');
    refuse({ type: 'removeNode', node: 'a' }, 'STALE_REVISION', state.revision - 1);
    accept({ type: 'removeNode', node: 'a' });
    assert.deepEqual(state.document.graph.nodes.map(node => node.id), ['b', 'c']);
    assert.deepEqual(state.document.graph.edges, []);
    assert.deepEqual(state.document.graph.inputs, {});
    assert.deepEqual(state.document.graph.outputs, beforeRemoval.graph.outputs);
    assert.deepEqual(state.document.layout.groups, { pair: ['b'] });
    accept({ type: 'undo' });
    assert.deepEqual(state.document, beforeRemoval);
    accept({ type: 'redo' });
    assert.deepEqual(state.document.graph.edges, []);
    accept({ type: 'undo' });
    const prior = state;
    accept({ type: 'paste', clipboard: copySelection(state.document, []) });
    assert.equal(state, prior);
    const clipboard = copySelection(state.document, ['a', 'b']);
    refuse({ type: 'paste', clipboard: { ...clipboard, nodes: [a, a] } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, positions: {} } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, positions: { ...clipboard.positions, a: { x: Infinity, y: 0 } } } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, positions: { ...clipboard.positions, a: { x: 0, y: Infinity } } } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, wires: [{ ...wire, from: port('other', 'alert') }] } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, wires: [{ ...wire, to: port('other', 'stock') }] } }, 'INVALID_CLIPBOARD');
    refuse({ type: 'paste', clipboard: { ...clipboard, wires: [{ ...wire, capacity: 257 }] } }, 'INVALID_CAPACITY');
    refuse({ type: 'paste', clipboard: { ...clipboard, wires: [wire, wire] } }, 'PORT_CARDINALITY');
    accept({ type: 'paste', clipboard });
    const [first, second] = state.document.graph.nodes.slice(-2);
    assert.notEqual(first.id, second.id);
    assert.deepEqual(state.document.graph.edges.at(-1),
      { from: port(first.id, 'alert'), to: port(second.id, 'stock'), capacity: 16 });
    assert.deepEqual(state.document.graph.inputs, beforeRemoval.graph.inputs);
    assert.deepEqual(state.document.graph.outputs, beforeRemoval.graph.outputs);
    accept({ type: 'undo' });
    accept({ type: 'paste', clipboard });
    assert(!state.document.graph.nodes.some(node => node.id === first.id || node.id === second.id));
    refuse({ type: 'disconnect', wire: reverse }, 'UNKNOWN_EDGE');
    accept({ type: 'disconnect', wire });
    accept({ type: 'unexposeInput', name: 'stock' });
    accept({ type: 'unexposeOutput', name: 'alert' });
    accept({ type: 'ungroup', name: 'pair' });

    for (let i = 0; i < 105; i++) accept({ type: 'moveNode', node: 'b', position: { x: i, y: 0 } });
    assert.equal(state.past.length, 100);
    state = createEditorState([a, b]);
    accept({ type: 'removeNode', node: 'a' });
    accept({ type: 'addNode', node: c });
    assert.notDeepEqual(state.document.layout.positions.b, state.document.layout.positions.c);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
};
