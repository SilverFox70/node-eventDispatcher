# S27 execution receipt

The user authorized S27 and requested an installed-browser regression with two Alert nodes. PR #44 merged at `7a7cbb89d1768e797bee4919f288822f22521c59`. The S26 packed and workspace receipts establish the existing editor, package and client boundaries. No dependency changes are planned.

The browser case first ran against the actual S26 production app. Dragging the first Alert changed the second card's screen position, reproducing canvas pan. S27 uses one document command reducer for semantic and layout edits. React Flow is the canvas adapter.

## Conditions and acceptance

- X27.1 uses the installed public editor model in `test/next/editor-document.cjs`. Removing a node atomically removes its incident wire, exposed input and group membership. Undo restores the exact graph and layout snapshots. A stale revision leaves the same state and history. Undo and redo keep the original edit entry.
- X27.2 uses `test/next/editor.test.js` in the production Next app. Add two Inventory Alerts, drag the first, and assert the second retains its canvas transform and screen position. Wire the two, expose the first input, delete the first and undo. The wire returns in the accessible connection list and on the canvas, the exposed input returns, and both positions are restored. Redo repeats the deletion. The test also uses a keyboard movement button and drag-to-connect. The installed model hashes the same graph before and after a layout-only move and verifies that only the layout hash changes.
- X27.3 exercises invalid capacity and a cycle in the browser with unchanged wiring. The installed model also rejects incompatible or missing ports, a reused ID and invalid clipboard wiring. Copy/paste uses fresh IDs and retains only internal wires. The browser covers grouping, ungrouping, exposed ports and copy/paste. No editor action invokes a factory. The fixture Alert keeps the input and output packet shape compatible so two instances can be connected.

The first packed browser run used an earlier assertion that depended on an off-screen SVG edge being measured immediately. The revised assertion checks the connection list after an invalid edit and independently requires the rendered wire to return after undo. The revised focused browser case and the installed model passed against the same packed app. Separate browser captures retain both editor navigations. Source-mapped coverage now also admits the installed editor's emitted modules so direct model assertions count against their TypeScript. The combined coverage gate passed without threshold changes.

Local evidence: `/tmp/fbp-s27-red.log`, `/tmp/fbp-s27-packed-focused.log`, `/tmp/fbp-s27-measure2.log`. Core runtime, package manifests and lockfiles did not change, so the S26 core coverage and core-only tarball receipts remain applicable. Candidate `4bea5d5ac5361e75ab22cb8488100e16ecdd16d1` passed build, typecheck, lint and guidance integrity. The final packed production suite passed 54/54 tests and the fixture coverage gate, including the unexecuted-source canary. Editor source reached 100% measured lines and statements and at least 99.16% branches per file. The local npm workspace passed clean install, the same browser regression and core rebuild verification. Final logs: `/tmp/fbp-s27-check-final.log`, `/tmp/fbp-s27-next-final.log`, `/tmp/fbp-s27-workspace-delivery.log`.

S27 is complete for review. The editable draft remains session-local. S28 follows the actual S27 merge and adds node configuration fields with authoritative backend validation.

Publication: [PR #45](https://github.com/SilverFox70/node-eventDispatcher/pull/45) opened against master with verified candidate `a09467c09d23b17995fe37f1fe144a2c3d4f1c3b`.
