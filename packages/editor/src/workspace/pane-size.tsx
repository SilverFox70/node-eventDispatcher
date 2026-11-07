export function PaneSize({ label, id, size, min, max, change }: {
  label: string; id: string; size: number; min: number; max: number; change: (value: number) => void;
}) {
  return <label className="nodeflow-pane-size">
    <span>{label}</span>
    <input type="range" min={min} max={max} step={10} value={size}
      aria-controls={id} aria-valuetext={`${size} pixels`} onChange={event => change(event.currentTarget.valueAsNumber)} />
  </label>;
}
