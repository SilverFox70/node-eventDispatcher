# S34 execution receipt

- Keep the trusted boundary in the server-only artifacts host. Use the existing regression fixture runner and the normal graph compiler. A host provides its verified registry lock, runtime/service profile identity, approved fixture, and service-aware registry construction. A browser or imported file cannot supply a passing receipt.
- Resolve the saved draft and verify its expected revision and trusted registry before compiling or invoking a node. Persist a host-issued receipt only after the existing fixture runner verifies all assertions. Bind the receipt to workspace/document, semantic hash, fixture and assertion hashes, runtime, policy and service profile.
- Keep the existing draft worker and migrate schema v1 transactionally to v2. Resolve the receipt and current draft under the lock transaction. Compare the expected draft revision and all current trusted pins. Layout-only edits can reuse an otherwise matching receipt when the caller supplies the current draft revision. The release uniqueness key excludes layout, actor, clock and receipt ID, so equivalent concurrent lock requests return one revision with the original provenance.
- Load and fork within the trusted workspace. Fork creates a new draft at revision zero with separate layout and edit history. Verify exact implementation and contract digests before resolving a locked registry and compiling the graph.
- X34.1–3 proof uses real SQLite, ordinary fixture execution, failed assertions and forged/stale receipt refusal, preserved bytes after edits, concurrent workers, and a registry mismatch before resolution.

S33 merged at `984641dc1604bf9e16867757e99614b8faefcc4e`. The editor cleanup merged at `508f27e737bea7d234ced220ebf8496794db5f60` after all four checks passed. S34 branches from that merge. The user authorized the full slice. The trusted fixture and registry configuration stays in the application server host.


## Verification

- The S33 packed baseline confirmed that its real SQLite schema stored only the current draft. Local evidence is in `/tmp/fbp-s34-baseline.log`.
- X34.1 refuses forged and cross-workspace receipts, fixture/profile changes, and stale revisions. A failed fixture assertion leaves no receipt row. X34.2 runs the locked graph using the ordinary compiler and confirms canonical content across a draft edit, fork and reopen. X34.3 races distinct receipts with equivalent evidence across real workers, checks that only one revision row is retained, and refuses a same-version implementation mismatch before registry resolution.
- The artifact suite passed nine tests and the unchanged per-file coverage threshold. Installed tests exercise the revision lifecycle and migration through public package imports. Local evidence is in `/tmp/fbp-s34-artifacts-green.log`.
- Build, typecheck and lint passed. All 55 packed Next tests and the unchanged coverage gate passed. The local workspace build, browser test and rebuild passed. Local evidence is in `/tmp/fbp-s34-check.log`, `/tmp/fbp-s34-next.log` and `/tmp/fbp-s34-workspace.log`. The final declaration-only refactoring was verified in the installed artifact test.

S34 exposes server APIs for the tested-revision lifecycle. The Next editor still offers draft editing and test runs. It does not yet offer a trusted fixture approval or lock control.
