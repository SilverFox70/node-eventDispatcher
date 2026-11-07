# NodeDispatcher editor

Install this optional package beside `event-driven-design`, React and React DOM. Use the public client entry from a React application and include its stylesheet.

```tsx
import { GraphEditor } from 'event-driven-design-editor';
import 'event-driven-design-editor/styles.css';

// Pass serializable catalog metadata from your application.
<GraphEditor catalog={catalog} />;
```

The palette adds registered nodes to an in-memory canvas. Select nodes on the canvas or in the keyboard-accessible list to inspect their port contracts. Drag one card to move it, or use the movement buttons in its details. Connect ports on the canvas or with the text form. Delete a node from its details and use Undo to restore its position and connected ports. Mark nodes to group or copy them. Paste gives copies new identities and keeps only wires internal to the copied selection. Select a configured node to edit its settings. With a host validation endpoint, Validate draft shows compiler errors on fields and ports. With a host test endpoint, Run test executes the validated draft against explicit inputs and displays the terminal and output packets.

The passive `event-driven-design-editor/model` entry exposes `createEditorState`, `applyEditorCommand`, `copySelection` and `draftIssues`. A command carries an ID and the expected revision. Refused edits preserve the draft and history. Layout is separate from the graph spec, and the session retains up to 100 undo steps.


From the NodeDispatcher checkout, run `npm run build` and `npm run build:editor`, then pack the core with `npm pack` and the editor with `npm pack --workspace event-driven-design-editor`. Install both tarballs in the host Next application. For an npm workspace, add the core and editor as local packages, declare their matching versions in the application, and build core, editor, then the app. The Next consumer and local workspace fixtures exercise both paths.

Supply a host-owned `validationEndpoint` to enable backend validation. It accepts JSON `{ graph, revision }` and returns `{ revision, issues }` using safe compiler issue codes and paths. Use `compileGraph(graph, registry, { configurationFields: true })` on the server to get field paths. Keep the registry and service bindings server-side. The editor discards responses that do not belong to its current draft.

Supply `testRun={{ endpoint, sampleHref }}` to connect the fixture-run panel. The host validates the graph and inputs before execution. The optional sample link opens a separate draft. The returned run is tied to the submitted graph digest and revision.

The live view reads bounded, revision-tagged snapshots from the host test endpoint using the per-run key. The fixture supports opt-in packet capture, job and stage selection, pause display, and reconnect without losing the draft. The live view belongs to the run's original graph revision.

On wide screens, the palette and inspector have width sliders and the canvas has a height slider. Drag a slider or use its arrow keys. On narrow screens, the side panels stack under or above the canvas. During a test, the live inspector names the latest transfer for the selected job. Use **All transfers for this job** to inspect its path across stages. **Show on canvas** pins a recorded transfer, and **Follow latest** returns to live activity.
