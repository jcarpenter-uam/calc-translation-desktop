import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { LoginView } from "./LoginView";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
          <p className="text-sm text-slate-300">Checking session...</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <LoginView />;
  }

  return <>{children}</>;
}
