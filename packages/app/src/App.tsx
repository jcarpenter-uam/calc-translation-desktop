type AppProps = {
  platform: "web" | "desktop";
};

export function App({ platform }: AppProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">calc-translation</p>
        <h1 className="mb-3 text-3xl font-semibold">Hello World ({platform})</h1>
        <p className="text-sm text-slate-300">
          Shared UI renders from <code>packages/app</code> in both variants.
        </p>
      </div>
    </main>
  );
}
