import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthContext";
import { AppLayout } from "./layout/AppLayout";
import { Home } from "./pages/Home";
import { ThemeProvider } from "./theme/ThemeContext";

type AppProps = {
  platform: "web" | "desktop";
};

export function App({ platform }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLayout>
          <AuthGate>
            <Home platform={platform} />
          </AuthGate>
        </AppLayout>
      </AuthProvider>
    </ThemeProvider>
  );
}
