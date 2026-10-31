import { defineComponent } from '../component.js';
import type { Component, PortMap, Values } from '../component.js';
import { objectContract } from '../contracts.js';
import type { Contract } from '../contracts.js';
import { derivePacket } from '../packet.js';
import type { Json } from '../packet.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { validateProcessOutput, onProcessRunEnd } from '../runtime/context-validation.js';
import { readyInputs } from './shared/ready-inputs.js';
import { JoinGroups } from './join-by-key/groups.js';
import { joinOptions } from './join-by-key/options.js';
import type { JoinOptions } from './join-by-key/options.js';
export type { JoinOptions } from './join-by-key/options.js';

/** Collate exact job/key groups once; parents and output fields follow input declaration order. */
export function joinByKey<const P extends PortMap>(inputs: P, options: JoinOptions): Component<P, { out: Contract<Values<P>> }> {
  const captured = readRecord(inputs, 'INVALID_ARGUMENT');
  const names = Object.keys(captured);
  if (names.length < 2 || names.length > 256) throw new FlowError('INVALID_ARGUMENT');
  const policy = joinOptions(options);
  const output = objectContract(policy.outputId, captured as PortMap);
  // Framework contracts validate JSON; restore each port's exact inferred type at the public boundary.
  const ports = captured as Readonly<Record<string, Contract<Json>>>;
  return defineComponent({
    id: 'join-by-key', version: 1, title: 'Join by key', description: 'Bounded job/key result collation', in: ports, out: { out: output },
    create: () => async ctx => {
      const groups = new JoinGroups(names, policy.maxKeys, policy.completedGroupLimit);
      onProcessRunEnd(ctx, () => groups.clear());
      for await (const { name, value: packet } of readyInputs(ctx.inputs, names)) {
        const parents = groups.accept(name, packet);
        if (!parents) continue;
        const value = Object.fromEntries(names.map((port, index) => [port, parents[index]!.value]));
        validateProcessOutput(ctx, 'out', value);
        await ctx.send('out', derivePacket(value, parents));
      }
      groups.finish();
    }
  }) as unknown as Component<P, { out: Contract<Values<P>> }>;
}
