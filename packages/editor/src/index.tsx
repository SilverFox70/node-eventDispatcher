'use client';

import { useId, useMemo, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Catalog, ExecutionTraceEvent, GraphSpecV2 } from 'event-driven-design/model';
import { applyEditorCommand, copySelection, createEditorState, draftIssues, paletteEntries } from './model.js';
import type { EditorNode, EditorState } from './model.js';
import type { Clipboard, Edit, EditorCommand, EditorIssue, Layout } from './document/types.js';
import { nextNodeId } from './document/clipboard.js';
import { NodeDetails } from './node-details.js';
import type { CanvasNode } from './canvas-node.js';
import { EditorCanvas } from './canvas/editor-canvas.js';
import { PortCommands } from './canvas/port-commands.js';
import { ConfigurationPanel } from './configuration/panel.js';
import { useValidation } from './validation/use-validation.js';
import { LiveRunPanel } from './debug/live-panel.js';
import { useLiveRun } from './debug/use-live-run.js';
import type { DebugSession } from './debug/live-model.js';
import { TestRunPanel } from './runs/panel.js';
import type { TestRunOptions } from './runs/panel.js';
import { PaneSize } from './workspace/pane-size.js';
import { DraftControls } from './documents/draft-controls.js';
import type { DraftStorage } from './documents/draft-controls.js';
import { SelectionCommands } from './canvas/selection-commands.js';

export type GraphEditorProps = Readonly<{
  catalog: Catalog;
  validationEndpoint?: string;
  initialGraph?: GraphSpecV2;
  initialLayout?: Layout;
  draftStorage?: DraftStorage;
  testRun?: TestRunOptions;
  initialNodes?: readonly EditorNode[];
}>;
type Operation = Edit | { type: 'undo' } | { type: 'redo' };

type Session = { state: EditorState; selected?: string; issue?: EditorIssue };
type Action = { type: 'select'; node: string } | { type: 'command'; command: EditorCommand };

function initialize({ nodes, graph, layout }: {
  nodes: readonly EditorNode[]; graph: GraphSpecV2 | undefined; layout: Layout | undefined;
}): Session {
  return { state: createEditorState(nodes, graph, layout) };
}

/** An ephemeral graph editor over application-provided catalog metadata. */
export function GraphEditor({ catalog, initialNodes = [], initialGraph, initialLayout, draftStorage, validationEndpoint, testRun }: GraphEditorProps) {
  const [session, update] = useReducer((current: Session, action: Action): Session => {
    if (action.type === 'select') return { ...current, selected: action.node };
    const result = applyEditorCommand(current.state, action.command, catalog);
    if (!result.ok) return { ...current, issue: result.issue };
    const selected = action.command.type === 'addNode' ? action.command.node.id : current.selected;
    return { state: result.state, selected };
  }, { nodes: initialNodes, graph: initialGraph, layout: initialLayout }, initialize);
  const helpId = useId();
  const paletteId = useId();
  const canvasId = useId();
  const inspectorId = useId();
  const [paletteWidth, setPaletteWidth] = useState(190);
  const [inspectorWidth, setInspectorWidth] = useState(340);
  const [canvasHeight, setCanvasHeight] = useState(480);
  const commandId = useRef(0);
  const [marks, setMarks] = useState<readonly string[]>([]);
  const [clipboard, setClipboard] = useState<Clipboard>();
  const { state, issue } = session;
  const { graph, layout } = state.document;
  const [debugSession, setDebugSession] = useState<DebugSession>();
  const [watchedJob, setWatchedJob] = useState('');
  const [watchedStage, setWatchedStage] = useState('');
  const [paused, setPaused] = useState(false);
  const [focusedTransfer, setFocusedTransfer] = useState<ExecutionTraceEvent>();
  const [frozenEvents, setFrozenEvents] = useState<readonly ExecutionTraceEvent[]>([]);
  const live = useLiveRun(testRun?.endpoint, debugSession);
  const events = paused ? frozenEvents : live?.snapshot?.trace.events ?? [];
  const activeJob = events.some(event => event.jobId === watchedJob) ? watchedJob : events[0]?.jobId;
  const latest = events.filter(event => event.jobId === activeJob).at(-1);
  const transfer = focusedTransfer ?? latest;
  const sameDraft = debugSession?.revision === state.revision;
  const activity = !paused && !focusedTransfer && sameDraft
    ? live?.transfers.filter(event => event.jobId === activeJob)
    : undefined;
  function pause(value: boolean) {
    setFrozenEvents(events);
    setPaused(value);
  }
  function watchJob(id: string) {
    setWatchedJob(id);
    setFocusedTransfer(undefined);
  }
  const validation = useValidation(graph, state.revision);
  const entries = useMemo(() => paletteEntries(catalog), [catalog]);
  const byIdentity = useMemo(() => new Map(entries.map(item => [item.identity, item.descriptor])), [entries]);
  const selected = graph.nodes.find(node => node.id === session.selected);
  const selectedPath = `$.nodes[${graph.nodes.findIndex(node => node.id === session.selected)}]`;
  const selectedDescriptor = selected && byIdentity.get(selected.component);
  const marked = marks.filter(id => Object.hasOwn(layout.positions, id));
  const issues = useMemo(() => draftIssues(graph, catalog), [graph, catalog]);
  const canvas: CanvasNode[] = graph.nodes.map(node => {
    const descriptor = byIdentity.get(node.component);
    return {
      id: node.id, type: 'component', position: layout.positions[node.id]!,
      data: { label: descriptor?.title ?? `Unavailable · ${node.component}`, descriptor },
      width: 175, height: 100, selected: node.id === session.selected,
    };
  });

  function select(node: string) {
    update({ type: 'select', node });
    if (debugSession?.graph.nodes.some(item => item.id === node)) setWatchedStage(node);
  }
  function observe(next: DebugSession | undefined) {
    watchJob('');
    setWatchedStage(session.selected ?? '');
    setPaused(false);
    setDebugSession(next);
  }
  function dispatch(operation: Operation) {
    update({ type: 'command', command: { ...operation, id: `edit-${++commandId.current}`, expectedRevision: state.revision } });
  }

  const sizes = {
    '--nodeflow-palette': `${paletteWidth}px`, '--nodeflow-inspector': `${inspectorWidth}px`, '--nodeflow-height': `${canvasHeight}px`,
  } as CSSProperties;
  return <div className="nodeflow-editor" style={sizes}>
    <section className="nodeflow-palette" id={paletteId} aria-label="Node palette">
      <PaneSize label="Palette width" id={paletteId} size={paletteWidth} min={150} max={280} change={setPaletteWidth} />
      <h2>Node palette</h2>
      <ul>{entries.map(({ identity, descriptor }) => <li key={identity}>
        <button type="button" aria-label={`Add ${descriptor.title}`} onClick={() =>
          dispatch({ type: 'addNode', node: { id: nextNodeId(state.used, graph.nodes.length + 1), component: identity } })
        }>{descriptor.title}</button>
        <small>{identity}</small>
      </li>)}</ul>
    </section>
    <section className="nodeflow-main" aria-label="Graph canvas" aria-describedby={helpId}>
      <h2>Canvas</h2>
      <details><summary>Canvas controls</summary><p id={helpId}>Use Select in the node list or click a card. Drag a card to move it, or use the movement buttons.</p>
      <p>Drag between port handles or use Connect ports. Use Delete selected node to remove a card and its wires. Undo restores them.</p></details>
      {validationEndpoint && <>
        <button type="button" onClick={() => void validation.validate(validationEndpoint)}>Validate draft</button>
        <p role="status">{validation.message}</p>
        <ul aria-label="Backend issues">{validation.issues.map(issue =>
          <li key={`${issue.path}:${issue.code}`}>{issue.code} · {issue.path}</li>)}</ul>
      </>}
      <div role="group" aria-label="Edit history">
        <button type="button" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })}>Undo</button>{' '}
        <button type="button" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })}>Redo</button>{' '}
        <output aria-label="Draft changes">{state.document === state.baseline ? 'No edits' : 'Edited draft'}</output>
      </div>
      {issue && <p role="alert">{issue.code} · {issue.path}</p>}
      {draftStorage && <DraftControls storage={draftStorage} document={state.document} />}
      <PaneSize label="Canvas height" id={canvasId} size={canvasHeight} min={300} max={800} change={setCanvasHeight} />
      <EditorCanvas id={canvasId} nodes={canvas} wires={graph.edges} activity={activity}
        transfer={sameDraft ? transfer : undefined} select={select} dispatch={dispatch} />
      <SelectionCommands nodes={canvas} groups={layout.groups} marked={marked} clipboard={clipboard} select={select}
        mark={id => setMarks(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}
        copy={() => setClipboard(copySelection(state.document, marked))} dispatch={dispatch} />
      <PortCommands nodes={canvas} graph={graph} dispatch={dispatch} />
      <details><summary>Draft validation ({issues.length})</summary>
        <ul>{issues.map(issue => <li key={`${issue.path}:${issue.code}`}>{issue.code} · {issue.path}</li>)}</ul>
      </details>
    </section>
    <div className="nodeflow-inspector" id={inspectorId}>
      <PaneSize label="Inspector width" id={inspectorId} size={inspectorWidth} min={260} max={540} change={setInspectorWidth} />
      {debugSession && <LiveRunPanel key={debugSession.id} session={debugSession} live={live} revision={state.revision}
        chosenJob={watchedJob} setJob={watchJob} stage={watchedStage} setStage={setWatchedStage}
        paused={paused} setPaused={pause} transfer={sameDraft ? transfer : undefined}
        focused={focusedTransfer} setFocused={setFocusedTransfer} />}
      {testRun && <TestRunPanel options={testRun} graph={graph} revision={state.revision} ready={validation.ready} observe={observe} />}
      <section aria-label="Selected node">
        <h2>Selected node</h2>
        {selected ? <>
          <h3>{selectedDescriptor?.title ?? 'Unavailable component'}</h3>
          <p>{selected.id} · {selected.component}</p>
          <button type="button" onClick={() => dispatch({ type: 'removeNode', node: selected.id })}>Delete selected node</button>
          <div className="nodeflow-move" role="group" aria-label="Move selected node" aria-describedby={helpId}>
            {([{ name: 'Left', x: -20, y: 0 }, { name: 'Right', x: 20, y: 0 },
              { name: 'Up', x: 0, y: -20 }, { name: 'Down', x: 0, y: 20 }]).map(delta =>
              <button key={delta.name} type="button" onClick={() => {
                const point = layout.positions[selected.id]!;
                dispatch({ type: 'moveNode', node: selected.id, position: { x: point.x + delta.x, y: point.y + delta.y } });
              }}>{delta.name}</button>)}
          </div>
          {selectedDescriptor && <NodeDetails descriptor={selectedDescriptor} path={selectedPath} issues={validation.issues} />}
          {selectedDescriptor?.configuration && <ConfigurationPanel key={selected.id}
            descriptor={selectedDescriptor.configuration} value={selected.config}
            path={selectedPath + ".config"} issues={validation.issues}
            change={config => dispatch({ type: 'setConfig', node: selected.id, ...(config === undefined ? {} : { config }) })} />}
        </> : <p>Select a node to inspect its ports.</p>}
      </section>
    </div>
  </div>;
}
