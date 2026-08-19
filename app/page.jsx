export default function Home() {
  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">🎯 UseNeedLens Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Live Intent & Developer Lead Ingestion</p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          System Live
        </span>
      </div>
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
        Dashboard initialiseret og klar.
      </div>
    </main>
  );
}
