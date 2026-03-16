import { AdminPanel } from "../admin/AdminPanel";
import { useAuth } from "../auth/AuthContext";

function navigateToHome() {
  const browser = globalThis as typeof globalThis & {
    location?: { hash?: string };
  };

  if (browser.location) {
    browser.location.hash = "#/";
  }
}

export function AdminPage() {
  const { tenantName, tenantId } = useAuth();

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Admin Console
              </p>
              <h1 className="text-2xl font-semibold">
                User and Tenant Management
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                Manage users for {tenantName || tenantId || "active tenant"}.
              </p>
            </div>

            <button
              type="button"
              onClick={navigateToHome}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              Back to Dashboard
            </button>
          </div>

          <AdminPanel />
        </div>
      </section>
    </main>
  );
}
