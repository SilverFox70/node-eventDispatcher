import Link from 'next/link';
import ReviewForm from './review-form';

export default function ContentReviewPage() {
  return <main><h1>Product content review</h1>
    <p>Check listing text, image descriptions and publication rules before opening a preview.</p>
    <ReviewForm />
    <p><Link href="/">Back to demos</Link></p>
  </main>;
}
