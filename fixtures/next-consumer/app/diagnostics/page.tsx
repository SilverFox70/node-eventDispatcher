import Link from 'next/link';
import DiagnosticInspector from './viewer';
export default function Page() {
  return <main className="inspector-page"><h1>Live diagnostic controls</h1>
    <p><Link href="/inspector">Back to graph inspector</Link></p><DiagnosticInspector /></main>;
}
