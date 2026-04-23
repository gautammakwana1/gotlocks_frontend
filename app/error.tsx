"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Production Error Caught by Boundary:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Background with sparkles if available, or just a gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-20 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <svg
              className="h-10 w-10 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Something went wrong
          </h1>
          <p className="mx-auto max-w-md text-gray-400">
            The application encountered an unexpected error. We&apos;ve been notified
            and are looking into it.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => reset()}
            className="group relative flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:bg-sky-50 active:scale-95"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/home")}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
          >
            Go home
          </button>
        </div>

        {/* {process.env.NODE_ENV !== "production" && (
          <div className="mt-8 max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-left">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-red-400">
              Debug Info:
            </p>
            <pre className="overflow-auto text-xs text-red-200/60 scrollbar-hide">
              {error.message}
              {error.stack}
            </pre>
          </div>
        )} */}
      </div>
    </div>
  );
}
