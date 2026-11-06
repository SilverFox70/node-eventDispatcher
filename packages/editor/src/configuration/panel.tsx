import type { Json, PortDescriptor } from 'event-driven-design/model';
import type { EditorIssue } from '../document/types.js';
import { ConfigurationField } from './fields.js';
import { fieldFor } from './schema.js';

export function ConfigurationPanel({ descriptor, value, path, change, issues }: {
  descriptor: PortDescriptor; value: Json | undefined; path: string;
  change: (value: Json | undefined) => void; issues: readonly EditorIssue[];
}) {
  const field = fieldFor(descriptor.schema);
  return <section aria-label="Node settings">
    <h3>Node settings</h3>
    <p>Settings stay with this node. Packets carry the data that changes each time the node runs.</p>
    {field ? <ConfigurationField field={field} name="Configuration" path={path} value={value}
      required root change={change} issues={issues} /> : <p>These settings use a schema the editor cannot edit.</p>}
    {value !== undefined && <button type="button" onClick={() => change(undefined)}>Clear settings</button>}
  </section>;
}
