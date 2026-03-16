import { AuthGate } from "./auth/AuthGate";
import { AuthProvider, useAuth } from "./auth/AuthContext";

type AppProps = {
  platform: "web" | "desktop";
};

function AuthenticatedHome({ platform }: AppProps) {
  const { user, tenantId, logoutAndReset } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          calc-translation
        </p>
        <h1 className="mb-3 text-3xl font-semibold">Hello World ({platform})</h1>
        <div className="space-y-2 text-sm text-slate-300">
          <p>
            Signed in as <span className="font-semibold text-slate-100">{user?.name || user?.email || "Unknown"}</span>
          </p>
          <p>
            Role: <span className="font-semibold text-slate-100">{user?.role || "unknown"}</span>
          </p>
          <p>
            Tenant: <span className="font-semibold text-slate-100">{tenantId || "unknown"}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void logoutAndReset();
          }}
          className="mt-6 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          Log out
        </button>
      </div>
    </main>
  );
}

export function App({ platform }: AppProps) {
  return (
    <AuthProvider>
      <AuthGate>
        <AuthenticatedHome platform={platform} />
      </AuthGate>
    </AuthProvider>
  );
}
