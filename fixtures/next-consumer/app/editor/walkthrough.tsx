export function Walkthrough({ practice }: { practice: boolean }) {
  return <details open={practice}>
    <summary>First-run walkthrough</summary>
    {practice ? <>
      <h2>Practice draft</h2>
      <p>Use Tab to reach controls, Enter to activate buttons, and arrow keys to choose ports. You can close this guide and reopen it whenever you need it.</p>
      <ol>
        <li>Add two Inventory Alert nodes. Select the second and use Left or Right to move it. Try Undo and Redo.</li>
        <li>Select each node and set its threshold. Use 5 for node-1 and 2 for node-2.</li>
        <li>In Connect ports, wire node-1’s alert to node-2’s stock. Leave capacity at 16.</li>
        <li>Expose node-1’s stock as <code>incoming</code> and node-2’s alert as <code>outgoing</code>.</li>
        <li>Choose Validate draft. Paste <code>{'{"incoming":[{"quantity":4,"low":false}]}'}</code> into Test inputs as JSON. Enable Capture test payloads, then choose Run test.</li>
        <li>In Live packet view, select node-1 and find its sent packet with <code>low: true</code>. Choose Final outputs and find <code>low: false</code>, the result from the second threshold.</li>
      </ol>
    </> : <p><a href="/editor?walkthrough=1" target="_blank" rel="noreferrer">Open a separate practice draft</a> to build a two-node inventory flow. Your current draft stays in this tab.</p>}
  </details>;
}
