import { FlowError } from 'event-driven-design';
import type { Registry } from 'event-driven-design';
import type { GraphSpec } from 'event-driven-design/model';

import type { joinPolicy } from 'event-driven-design/task-profile';

type Definition = Readonly<{
  spec: GraphSpec; registry: Registry; operators: ReadonlyMap<string, string>;
  joins: ReadonlyMap<string, NonNullable<ReturnType<typeof joinPolicy>>>;
  waits: ReadonlyMap<string, string>;
}>;
const definitions = new WeakMap<object, Definition>();

export function rememberProfile(profile: object, definition: Definition): void {
  definitions.set(profile, definition);
}

export function profileDefinition(profile: object): Definition {
  const definition = definitions.get(profile);
  if (!definition) throw new FlowError('VERSION_UNAVAILABLE');
  return definition;
}
