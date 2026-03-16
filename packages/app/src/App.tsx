import { AuthGate } from "./auth/AuthGate";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ThemeToggle } from "./theme/ThemeToggle";

type AppProps = {
  platform: "web" | "desktop";
};

function AuthenticatedHome({ platform }: AppProps) {
  const { user, tenantId, logoutAndReset } = useAuth();

  return (
    <main className="min-h-screen bg-canvas px-6 py-16 text-ink">
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">
          calc-translation
        </p>
        <h1 className="mb-3 text-3xl font-semibold">Hello World ({platform})</h1>
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            Signed in as <span className="font-semibold text-ink">{user?.name || user?.email || "Unknown"}</span>
          </p>
          <p>
            Role: <span className="font-semibold text-lime">{user?.role || "unknown"}</span>
          </p>
          <p>
            Tenant: <span className="font-semibold text-ink">{tenantId || "unknown"}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void logoutAndReset();
          }}
          className="mt-6 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
        >
          Log out
        </button>
      </div>
    </main>
  );
}

export function App({ platform }: AppProps) {
  return (
    <ThemeProvider>
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <AuthProvider>
        <AuthGate>
          <AuthenticatedHome platform={platform} />
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
