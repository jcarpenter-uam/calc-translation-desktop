import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { Login } from "../pages/Login";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useAuth();

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

  return <>{children}</>;
}
