import { useId } from 'react';
import type { Json } from 'event-driven-design/model';
import { objectValue } from './schema.js';
import type { Field } from './schema.js';
import type { EditorIssue } from '../document/types.js';

type Props = {
  field: Field; name: string; path: string; value: Json | undefined; required: boolean;
  change: (value: Json | undefined) => void;
  issues: readonly EditorIssue[]; root?: true;
};

export function ConfigurationField({ field, name, path, value, required, change, issues, root }: Props) {
  const id = useId();
  const issue = issues.find(item => item.path === path);
  const helpId = `${id}-help`;
  const issueId = `${id}-issue`;
  const described = issue ? `${helpId} ${issueId}` : helpId;
  const props = { id, 'aria-invalid': issue ? true as const : undefined, 'aria-describedby': described };
  if (field.kind === 'object') {
    const record = objectValue(value);
    return <fieldset aria-describedby={described}>
      <legend>{name}{!required && ' (optional)'}</legend>
      <small id={helpId}>Choose which settings to provide explicitly.</small>
      {issue && <p id={issueId}>{issue.code} · Review the settings in this group.</p>}
      {root || record ? field.fields.map(child => <ConfigurationField key={child.name}
        name={child.name} field={child.field} required={child.required} path={path + `[${JSON.stringify(child.name)}]`}
        value={record && Object.hasOwn(record, child.name) ? record[child.name] : undefined}
        issues={issues} change={next => {
          const updated = Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => key !== child.name));
          change(next === undefined ? updated : { ...updated, [child.name]: next });
        }} />) : <button type="button" onClick={() => change({})}>Add {name}</button>}
      {!root && record && <button type="button" onClick={() => change(undefined)}>Remove {name}</button>}
    </fieldset>;
  }

  const label = <label htmlFor={id}>{name}</label>;
  return <div className="nodeflow-setting">
    {label}
    {field.kind === 'enum' ? <select {...props} value={String(field.values.findIndex(item => item === value))}
      onChange={event => change(field.values[Number(event.currentTarget.value)])}>
      <option value="-1">Choose a value</option>
      {field.values.map((item, index) => <option key={index} value={index}>{String(item)}</option>)}
    </select> : field.kind === 'boolean' ? <select {...props} value={typeof value === 'boolean' ? String(value) : ''}
      onChange={event => change(event.currentTarget.value ? event.currentTarget.value === 'true' : undefined)}>
      <option value="">Choose a value</option><option value="true">True</option><option value="false">False</option>
    </select> : field.kind === 'number' ? <input {...props} type="number" step="any"
      value={typeof value === 'number' ? value : ''} onChange={event => {
        const number = event.currentTarget.valueAsNumber;
        change(Number.isFinite(number) ? number : undefined);
      }} /> : <input {...props} value={typeof value === 'string' ? value : ''} onChange={event => change(event.currentTarget.value)} />}
    <small id={helpId}>{field.kind === 'number' ? 'Enter a number, for example 5.' : required ? 'Provide a value.' : 'This setting is optional.'}</small>
    {issue && <p id={issueId}>{issue.code} · Correct this value and validate the draft again.</p>}
  </div>;
}
