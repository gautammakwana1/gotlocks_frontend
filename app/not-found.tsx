"use client";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-20 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <span className="text-2xl font-bold text-sky-400">404</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Page not found
          </h1>
          <p className="mx-auto max-w-sm text-gray-400">
            We couldn&apos;t find the page you&apos;re looking for. It might have been moved
            or deleted.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => (window.location.href = "/home")}
            className="group relative flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:scale-[1.02] hover:bg-sky-50 active:scale-95"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
