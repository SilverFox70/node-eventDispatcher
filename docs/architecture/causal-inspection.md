# Causal inspection

Open the live diagnostics demo and choose **Eligibility and parallel results**. Send three test jobs. Amounts 6 and 8 produce a joined output, and amount 4 is filtered out. Select an output to see its two immediate parents, the original admitted packet and the attempts bound to packets on each branch. Select the input for amount 4 to see the observed filter drop and the node's separately reported BELOW_THRESHOLD rule.

The same inspector works on the account and Pokémon examples. The selection belongs to the current run. Switching runs clears it. Eviction and disconnect can leave only partial evidence. Node payload capture still follows the existing controls. An unrecorded payload can coexist with complete packet lineage.

## Using the model

`validateCausalEvidence` and `explainCausal` are available from `event-driven-design/model`. Build the passive version 1 envelope with the selected run ID, its diagnostic and decision snapshots, and the host's execution identity. The two streams keep their own sequence numbers and loss counters. Resolve output sequences against the selected run's exposed output endpoints. Query by run ID, input or output packet ID, job ID, and a record budget between 1 and 1024. Keep the source/run authorization check in the host.

The explanation lists retained observations and packet parent links. Operation and attempt rows name the packets they were explicitly bound to. The diagnostic format records sends and task bindings separately, so an attempt's presence in the explanation does not prove that it emitted a particular packet. Missing endpoints are reported as gaps. A retained finish includes its observed duration. A missing output with no observed drop has unknown disposition.

`implementationIdentity` hashes a host-supplied build manifest. The host provides its required emitted-file closure separately so an incomplete manifest can be detected. `executionIdentity` binds those component digests, contract digests, graph, runtime/policy versions and service profile. The host owns the accuracy of the supplied digests. The demo labels identity unverified because it supplies no build manifest.

See the [S24B execution receipt](../cursor_plans/fbp-extensions/S24B-execution.md) for the selected contract and proof.
