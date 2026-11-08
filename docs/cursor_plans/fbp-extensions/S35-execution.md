# S35 execution receipt

- Use the v1 bundle envelope with a locked revision, optional layout, explicit binding manifest and lowercase SHA-256 over canonical unsigned JSON. Use strict UTF-8 and the existing 10 MiB artifact budget. The digest is integrity evidence, not origin authentication.
- Binding manifest v1 maps each unique pinned module binding ID to an exact package or package subpath and named export. Destination host provides both trusted registry lock and trusted binding manifest. Validate before writing. The importer never resolves, imports, installs or fetches modules.
- Inspection returns detached source provenance and layout. Import writes one new editable draft via the existing authorized workspace scope and atomic create. A conflict leaves the destination unchanged. The imported receipt remains source provenance, not a local passing receipt. Retesting is required to lock in the destination.
- Prove real SQLite import and conflict, registry mismatch before writes, canonical bytes, bounded rejection, and equivalent execution using the normal compiler and trusted locally installed bindings.

S34 merged in PR #53 at `0bce80984f7ac34f3e4043e255ae89d737c398b8`. The fixed head passed all four checks. S35 branches from that merge.

## Verification

- X35.1 and X35.3 exercise strict input size and UTF-8, malformed envelopes, tampering, invalid manifests and trusted binding mismatches. Rejected input does not reach the repository. The real SQLite fixture confirms workspace separation and refusal to overwrite an existing destination.
- X35.2 exports a real locked revision, imports it as a separate draft through an installed package, and executes the graph with the ordinary compiler and trusted registry. Output, semantic hash and layout match. The source receipt cannot lock the destination draft.
- Build, typecheck and lint passed. All 11 artifact tests and the installed package checks passed. All 55 packed Next tests and the unchanged coverage gate passed. Local evidence is in `/tmp/fbp-s35-check.log`, `/tmp/fbp-s35-artifacts-final.log` and `/tmp/fbp-s35-next.log`.

The server API returns provenance with the import. The editable draft stores graph, layout and pinned registry only. Retain the original bundle to keep its source metadata. S36 owns readable TypeScript export.
