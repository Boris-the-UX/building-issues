'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="card"><h1>Something went wrong</h1><p>Please try again. If the problem continues, contact your administrator.</p><button onClick={reset}>Try again</button></main>;
}
