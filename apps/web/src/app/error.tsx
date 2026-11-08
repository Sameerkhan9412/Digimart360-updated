'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="errorbox panel">
      <h1>Something went wrong on our side</h1>
      <p>We couldn&apos;t load this page just now. Please try again in a moment.</p>
      <button className="btn btn-green" type="button" onClick={reset}>Try again</button>
    </section>
  );
}
