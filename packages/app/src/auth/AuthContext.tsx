import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, logout, type AuthUser } from "./authClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  tenantId: string | null;
  refreshSession: () => Promise<void>;
  logoutAndReset: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    try {
      const session = await fetchMe();

      if (!session) {
        setUser(null);
        setTenantId(null);
        setStatus("unauthenticated");
        return;
      }

      setUser(session.user);
      setTenantId(session.tenantId);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setTenantId(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logoutAndReset = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setTenantId(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({ status, user, tenantId, refreshSession, logoutAndReset }),
    [status, user, tenantId, refreshSession, logoutAndReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
