import type { ComponentDescriptorV2, PortDescriptor } from 'event-driven-design/model';
import type { EditorIssue } from './document/types.js';
import { portType } from './model.js';

function Ports({ name, ports, path, issues }: {
  name: string; ports: Readonly<Record<string, PortDescriptor>>; path: string; issues: readonly EditorIssue[];
}) {
  const entries = Object.entries(ports);
  return <div>
    <h4>{name}</h4>
    {entries.length ? <ul>{entries.map(([id, port]) => {
      const issue = issues.find(item => item.path === path + `[${JSON.stringify(id)}]`);
      return <li key={id} title={port.contractId}>{id} · {portType(port)}
        {issue && <small>{issue.code} · Connect or expose this port once.</small>}</li>;
    })}</ul> : <p>None</p>}
  </div>;
}

export function NodeDetails({ descriptor, path, issues }: { descriptor: ComponentDescriptorV2; path: string; issues: readonly EditorIssue[] }) {
  return <>
    <p>{descriptor.description}</p>
    <Ports name="Inputs" ports={descriptor.in} path={path + ".in"} issues={issues} />
    <Ports name="Outputs" ports={descriptor.out} path={path + ".out"} issues={issues} />
    {descriptor.configuration && <p>Configuration · {portType(descriptor.configuration)}</p>}
  </>;
}
