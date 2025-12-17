import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/theme.jsx";
import { LanguageProvider } from "./context/language.jsx";
import { SettingsProvider } from "./context/settings.jsx";
import { AuthProvider } from "./context/auth";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={null}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </Suspense>
  </StrictMode>,
);
