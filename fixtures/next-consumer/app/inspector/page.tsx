import Link from 'next/link';
import Inspector from './inspector';

export default function Page() {
  return <main className="inspector-page"><h1>Graph and execution inspector</h1><p><Link href="/inspector/durable">Open durable workflow progress</Link></p><Inspector /></main>;
}
