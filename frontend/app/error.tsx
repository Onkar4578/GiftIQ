"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Something broke on this page</h1>
      <p className="mt-2 text-slate2">Reload it and try again. If it keeps happening, check that the backend is running.</p>
      <button className="btn-primary mt-5" onClick={reset}>
        Reload the page
      </button>
    </div>
  );
}
