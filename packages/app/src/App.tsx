import { useEffect, useMemo } from "react";
import { AppInfoProvider } from "./contexts/AppInfoContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { RouteProvider, useAppRoute } from "./contexts/RouteContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UiI18nProvider, useI18n } from "./contexts/UiI18nContext";
import { AuthGate } from "./auth/AuthGate";
import { initializeClientLogger, writeClientLog } from "./bugReports/clientLogger";
import { AppLayout } from "./layout/AppLayout";
import { Home } from "./pages/Home";
import { AdminPage } from "./pages/Admin";
import { CalendarPage } from "./pages/Calendar";
import { ConfigureMeetingPage } from "./pages/ConfigureMeeting";
import { MeetingLivePage } from "./pages/MeetingLive";
import { SWRConfig } from "swr";

type AppProps = {
  platform: "web" | "desktop";
};

/**
 * Chooses the active page after auth and route state have been resolved.
 */
function AppContent({ platform: _platform }: AppProps) {
  const { user } = useAuth();
  const { route, navigateTo } = useAppRoute();
  const { syncTranscriptLanguage, t } = useI18n();

  useEffect(() => {
    syncTranscriptLanguage(user?.languageCode);
  }, [syncTranscriptLanguage, user?.languageCode]);

  const isAdmin = useMemo(() => {
    return user?.role === "tenant_admin" || user?.role === "super_admin";
  }, [user?.role]);

  if (route === "admin" && !isAdmin) {
    return (
      <main className="min-h-[calc(100dvh-3rem)] px-6 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
          <p className="text-sm text-ink-muted">
            {t("admin.noAccess")}
          </p>
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="mt-4 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            {t("common.backToDashboard")}
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

/**
 * Root application shell shared by the web and desktop renderers.
 */
export function App({ platform }: AppProps) {
  initializeClientLogger();

  useEffect(() => {
    writeClientLog("info", "App boot", platform);
  }, [platform]);

  return (
    <SWRConfig
      value={{
        // Session-driven screens should refresh on reconnect, but noisy background retries make the
        // shell feel unstable when the API is unavailable.
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      <AppInfoProvider clientType={platform}>
        <ThemeProvider>
          <UiI18nProvider>
            <NotificationProvider>
              <AuthProvider>
                <RouteProvider mode={platform === "web" ? "path" : "hash"}>
                  <AppLayout>
                    <AuthGate>
                      <AppContent platform={platform} />
                    </AuthGate>
                  </AppLayout>
                </RouteProvider>
              </AuthProvider>
            </NotificationProvider>
          </UiI18nProvider>
        </ThemeProvider>
      </AppInfoProvider>
    </SWRConfig>
  );
}
