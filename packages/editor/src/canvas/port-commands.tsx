import type { FormEvent } from 'react';
import type { Endpoint } from 'event-driven-design/model';
import type { CanvasNode } from '../canvas-node.js';
import type { Edit, EditorDocument } from '../document/types.js';
import { wireId } from '../document/topology.js';

type Side = 'in' | 'out';
type PortOption = { key: string; side: Side; endpoint: Endpoint };
type Props = { nodes: CanvasNode[]; graph: EditorDocument['graph']; dispatch: (command: Edit) => void };

function PortOptions({ ports }: { ports: PortOption[] }) {
  return <>
    <option value="">Choose a port</option>
    {ports.map(({ key, endpoint }) => <option key={key} value={key}>{endpoint.node} · {endpoint.port}</option>)}
  </>;
}

export function PortCommands({ nodes, graph, dispatch }: Props) {
  const ports: PortOption[] = [];
  for (const node of nodes) {
    if (!node.data.descriptor) continue;
    for (const side of ['in', 'out'] as const) {
      for (const port of Object.keys(node.data.descriptor[side])) {
        ports.push({ key: JSON.stringify([side, node.id, port]), side, endpoint: { node: node.id, port } });
      }
    }
  }
  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const from = ports.find(port => port.key === fields.get('from'));
    const to = ports.find(port => port.key === fields.get('to'));
    if (!from || !to) return;
    dispatch({ type: 'connect', wire: { from: from.endpoint, to: to.endpoint, capacity: Number(fields.get('capacity')) } });
  }
  function expose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const port = ports.find(item => item.key === fields.get('port'));
    if (!port) return;
    dispatch({ type: port.side === 'in' ? 'exposeInput' : 'exposeOutput', name: String(fields.get('name')), endpoint: port.endpoint });
  }
  return <div className="nodeflow-port-commands">
    <form aria-label="Connect ports" onSubmit={connect}>
      <h3>Connect ports</h3>
      <label>From output <select name="from" required><PortOptions ports={ports.filter(port => port.side === 'out')} /></select></label>
      <label>To input <select name="to" required><PortOptions ports={ports.filter(port => port.side === 'in')} /></select></label>
      <label>Capacity <input name="capacity" type="number" defaultValue={16} required /></label>
      <button type="submit">Connect</button>
    </form>
    <ul aria-label="Connections">{graph.edges.map(wire => {
      const label = `${wire.from.node}.${wire.from.port} → ${wire.to.node}.${wire.to.port}`;
      return <li key={wireId(wire)}>
        <span>{label}</span> <button type="button" aria-label={`Disconnect ${label}`} onClick={() => dispatch({ type: 'disconnect', wire })}>Disconnect</button>
      </li>;
    })}</ul>
    <form aria-label="Expose port" onSubmit={expose}>
      <h3>Expose port</h3>
      <label>Port <select name="port" required>
        <option value="">Choose a port</option>
        {ports.map(({ key, endpoint, side }) =>
          <option key={key} value={key}>{side} · {endpoint.node} · {endpoint.port}</option>)}
      </select></label>
      <label>Graph port name <input name="name" required /></label>
      <button type="submit">Expose</button>
    </form>
    <ul aria-label="Exposed ports">
      {(['inputs', 'outputs'] as const).flatMap(side => Object.entries(graph[side]).map(([name, endpoint]) =>
        <li key={JSON.stringify([side, name])}>
          <span>{name} · {endpoint.node}.{endpoint.port}</span>{' '}
          <button type="button" aria-label={`Unexpose ${side} ${name}`} onClick={() =>
            dispatch({ type: side === 'inputs' ? 'unexposeInput' : 'unexposeOutput', name })}>Unexpose</button>
        </li>))}
    </ul>
  </div>;
}
