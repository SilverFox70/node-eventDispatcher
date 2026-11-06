import type { ComponentDescriptorV2, PortDescriptor } from 'event-driven-design/model';
import { portType } from './model.js';

function Ports({ name, ports }: {
  name: string; ports: Readonly<Record<string, PortDescriptor>>;
}) {
  const entries = Object.entries(ports);
  return <div>
    <h4>{name}</h4>
    {entries.length ? <ul>{entries.map(([id, port]) =>
      <li key={id} title={port.contractId}>{id} · {portType(port)}</li>)}</ul> : <p>None</p>}
  </div>;
}

export function NodeDetails({ descriptor }: { descriptor: ComponentDescriptorV2 }) {
  return <>
    <p>{descriptor.description}</p>
    <Ports name="Inputs" ports={descriptor.in} />
    <Ports name="Outputs" ports={descriptor.out} />
    {descriptor.configuration && <p>Configuration · {portType(descriptor.configuration)}</p>}
  </>;
}
