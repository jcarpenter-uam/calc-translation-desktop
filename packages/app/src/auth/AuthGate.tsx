import type { ReactNode } from "react";
import { Login } from "../pages/Login";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/UiI18nContext";
import { RequiredLanguageModal } from "./RequiredLanguageModal";
import { AppTourManager } from "../tour/AppTourManager";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { status, user } = useAuth();
  const { t } = useI18n();

  if (status === "loading") {
    return (
      <main className="min-h-[calc(100dvh-3rem)] px-6 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
          <p className="text-sm text-ink-muted">{t("auth.checkingSession")}</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Login />;
  }

  return (
    <>
      {children}
      <AppTourManager />
      <RequiredLanguageModal isOpen={user?.languageCode === null} />
    </>
  );
}
