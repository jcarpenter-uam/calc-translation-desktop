import { useAuth } from "../auth/AuthContext";

type AuthenticatedHomeProps = {
  platform: "web" | "desktop";
};

export function Home({ platform }: AuthenticatedHomeProps) {
  const { user, tenantId, logoutAndReset } = useAuth();

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mx-auto w-full max-w-xl rounded-2xl p-6 md:p-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Dashboard
            </p>
            <h1 className="mb-2 text-2xl font-semibold">Welcome back</h1>
            <p className="mb-6 text-sm text-ink-muted">
              You are signed in on {platform}.
            </p>

            <div className="grid gap-3 text-sm">
              <p className="rounded-xl border border-line/70 bg-canvas px-4 py-3 text-ink-muted">
                Signed in as{" "}
                <span className="font-semibold text-ink">
                  {user?.name || user?.email || "Unknown"}
                </span>
              </p>
              <p className="rounded-xl border border-line/70 bg-canvas px-4 py-3 text-ink-muted">
                Role:{" "}
                <span className="font-semibold text-lime">
                  {user?.role || "unknown"}
                </span>
              </p>
              <p className="rounded-xl border border-line/70 bg-canvas px-4 py-3 text-ink-muted">
                Tenant:{" "}
                <span className="font-semibold text-ink">
                  {tenantId || "unknown"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void logoutAndReset();
              }}
              className="mt-6 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              Log out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
