# S29 execution receipt

The user authorized S29 after PR #46 merged. Master base `91c3140af5ade3d8696ab8356f48fddf3c7fc9aa` includes the S28 validation and Chromium setup. The new HTTP regression returned 404 on the installed S28 app. S29 keeps the existing compiler and test harness and introduces no dependencies.

## Run boundary

The editor sends its validated draft revision, SHA-256 of the submitted graph JSON, test input values, and a per-run cancellation key. The fixture host accepts one local fixture profile and a static server registry. It recomputes the digest, compiles the exact submitted graph, validates every ingress value and assigns packet identities before invoking the runtime. One run is active in the local fixture process. Input, output, request and wall-clock limits are bounded. The cancel request must present the matching key. Closing the run request also signals cancellation. The runtime result includes the exact revision, graph digest, run identity, terminal status and output packets. This ephemeral fixture route relies on one local Next process.

The walkthrough opens a sample draft separately, with no execution until Run test. The sample broadcasts chair, desk and lamp to two abort-aware local lookups and joins their results with ordinary keyed collation. A draft edit during the slow fixture run keeps its result associated with the earlier revision.

## Evidence

- X29.1 exercises HTTP admission and quotas with real fixture lookup counters. Invalid inputs, unauthorized capability or component bindings and stale hashes leave the counters unchanged. An unrelated key cannot cancel the running test.
- X29.2 exercises the installed browser walkthrough, reconnects a sample edge, then verifies three outputs and their job, packet and parent lineage. The browser hashes the actual submitted graph and checks the returned receipt.
- X29.3 edits the output name during a slow run and checks that only the next run uses the new name. Browser cancellation and the API cancellation path both return the runtime cancellation terminal. Browser assets are checked for the server fixture effect marker.

Final packed and workspace verification pending.
