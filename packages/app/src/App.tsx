import { useEffect, useMemo } from "react";
import { AppInfoProvider } from "./app/AppInfoContext";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { initializeClientLogger, writeClientLog } from "./bugReports/clientLogger";
import { AppLayout } from "./layout/AppLayout";
import { Home } from "./pages/Home";
import { AdminPage } from "./pages/Admin";
import { CalendarPage } from "./pages/Calendar";
import { ConfigureMeetingPage } from "./pages/ConfigureMeeting";
import { MeetingLivePage } from "./pages/MeetingLive";
import { RouteProvider, useAppRoute } from "./routing/RouteContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { SWRConfig } from "swr";

type AppProps = {
  platform: "web" | "desktop";
};

function AppContent({ platform: _platform }: AppProps) {
  const { user } = useAuth();
  const { route, navigateTo } = useAppRoute();

  const isAdmin = useMemo(() => {
    return user?.role === "tenant_admin" || user?.role === "super_admin";
  }, [user?.role]);

  if (route === "admin" && !isAdmin) {
    return (
      <main className="min-h-[calc(100dvh-3rem)] px-6 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
          <p className="text-sm text-ink-muted">
            You do not have permission to access the admin console.
          </p>
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="mt-4 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (route === "admin") {
    return <AdminPage />;
  }

  if (route === "calendar") {
    return <CalendarPage />;
  }

  if (route === "configure") {
    return <ConfigureMeetingPage />;
  }

  if (route === "meeting") {
    return <MeetingLivePage />;
  }

  return <Home />;
}

export function App({ platform }: AppProps) {
  initializeClientLogger();

  useEffect(() => {
    writeClientLog("info", "App boot", platform);
  }, [platform]);

  return (
    <SWRConfig
      value={{
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      <AppInfoProvider clientType={platform}>
        <ThemeProvider>
          <AuthProvider>
            <RouteProvider mode={platform === "web" ? "path" : "hash"}>
              <AppLayout>
                <AuthGate>
                  <AppContent platform={platform} />
                </AuthGate>
              </AppLayout>
            </RouteProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppInfoProvider>
    </SWRConfig>
  );
}
