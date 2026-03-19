import { useAppRoute } from "../routing/RouteContext";

export function ConfigureMeetingPage() {
  const { navigateTo } = useAppRoute();

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Host Setup
              </p>
              <h1 className="text-2xl font-semibold">Configure Meeting</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Set up your hosted meeting details before starting a new session.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo("home")}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="rounded-2xl border border-line/70 bg-canvas p-5">
            <p className="text-sm text-ink-muted">
              Meeting configuration form goes here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
