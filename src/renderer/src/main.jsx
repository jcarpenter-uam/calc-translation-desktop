import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App.jsx";
import { ThemeProvider } from "./context/theme.jsx";
import { LanguageProvider } from "./context/language.jsx";
import { SettingsProvider } from "./context/settings.jsx";
import { AuthProvider } from "./context/auth";
import { NetworkProvider } from "./context/network.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <NetworkProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </NetworkProvider>
    </AuthProvider>
  </StrictMode>,
);
