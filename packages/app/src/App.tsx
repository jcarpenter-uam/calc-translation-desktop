import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppLayout } from "./layout/AppLayout";
import { Home } from "./pages/Home";
import { AdminPage } from "./pages/Admin";
import { ThemeProvider } from "./theme/ThemeContext";
import { SWRConfig } from "swr";

type AppProps = {
  platform: "web" | "desktop";
};

type AppRoute = "home" | "admin";

function resolveRouteFromHash(hashValue: string) {
  return hashValue === "#/admin" ? "admin" : "home";
}

function AppContent({ platform }: AppProps) {
  const { user } = useAuth();
  const [route, setRoute] = useState<AppRoute>(() => {
    const browser = globalThis as typeof globalThis & {
      location?: { hash?: string };
    };
    return resolveRouteFromHash(browser.location?.hash || "");
  });

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      location?: { hash?: string };
      addEventListener?: (name: string, handler: () => void) => void;
      removeEventListener?: (name: string, handler: () => void) => void;
    };

    const onHashChange = () => {
      setRoute(resolveRouteFromHash(browser.location?.hash || ""));
    };

    browser.addEventListener?.("hashchange", onHashChange);
    return () => {
      browser.removeEventListener?.("hashchange", onHashChange);
    };
  }, []);

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
        </div>
      </main>
    );
  }

  if (route === "admin") {
    return <AdminPage />;
  }

  return <Home platform={platform} />;
}

export function App({ platform }: AppProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <AppLayout>
            <AuthGate>
              <AppContent platform={platform} />
            </AuthGate>
          </AppLayout>
        </AuthProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
