import type { ReactNode } from "react";
import { Login } from "../pages/Login";
import { useAuth } from "../contexts/AuthContext";
import { RequiredLanguageModal } from "./RequiredLanguageModal";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <main className="min-h-[calc(100dvh-3rem)] px-6 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
          <p className="text-sm text-ink-muted">Checking session...</p>
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
      <RequiredLanguageModal isOpen={user?.languageCode === null} />
    </>
  );
}
