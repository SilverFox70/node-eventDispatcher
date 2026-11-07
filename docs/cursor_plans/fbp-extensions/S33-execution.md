# S33 execution receipt

The user authorized S33 after PR #50. Its Linux, macOS, Windows and Next checks passed, and master contains merge `ca5dab30522f0a2501f849ad56f1e35303926a15`.

## Storage contract

Use the pinned Node 26.13.0 [native SQLite Database API](https://nodejs.org/api/sqlite.html), a release-candidate API, in a dedicated worker. The worker owns one connection and transactions. Schema v1 stores canonical document JSON by workspace/document and a safe-integer revision. The acknowledged revision changes only after commit. Create starts at zero, and save compares an explicit expected revision inside the write transaction. Repository callers supply their trusted workspace scope; the local Next demo owns one fixed workspace and named draft. Drafts retain their S32 fingerprints. The worker ships from the optional SQLite export.

The demo uses an opt-in saved draft route, keeps ordinary and practice drafts independent, and exposes explicit save, debounced autosave and reload after conflict. UI cleanup follows S33 and does not change this slice's implementation scope.

## Proof

- X33.1 and X33.2 use independent SQLite workers. A stale save at revision 3 leaves revision 4 intact, and two concurrent revision 4 saves yield revision 5 and a conflict. Closed handles refuse subsequent operations. The optional package tests also check worker queue bounds and unsupported schema refusal.
- X33.3 kills a subprocess at a barrier inside the real transaction, after SQL update and before commit. Reopen returns the prior draft and fingerprints. A different workspace cannot load or update the draft. Browser tests keep failed and conflicting edits visibly unsaved, preserve newer edits across a pending acknowledgement, and reopen the saved graph and layout.
- The packed worker and artifact per-file coverage passed. The independent source workspace passed the browser test and a local source rebuild. Local evidence is in `/tmp/fbp-s33-artifacts-final.log` and `/tmp/fbp-s33-workspace-final.log`.
- The coverage remapper preserves raw evidence and filters mappings only when the entire mapped branch is closing punctuation. Executable and multiline branches still count. Local regression evidence is in `/tmp/fbp-s33-coverage-signal.log`.

Packed Next passed all 55 tests and the unchanged per-file coverage threshold, including the unexecuted-source canary. A second production Next process read revision 4 from the same database. Local evidence is in `/tmp/fbp-s33-next-green.log`. Build, typecheck and lint passed in `/tmp/fbp-s33-check.log`.
