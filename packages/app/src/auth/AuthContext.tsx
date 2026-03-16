import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { logout, type AuthUser } from "./authClient";
import { ApiError } from "../hooks/api";
import { useCurrentUser, useUpdateMyLanguage } from "../hooks/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  tenantId: string | null;
  tenantName: string | null;
  refreshSession: () => Promise<void>;
  logoutAndReset: () => Promise<void>;
  updateLanguagePreference: (languageCode: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateCurrentUser,
  } = useCurrentUser();
  const updateMyLanguage = useUpdateMyLanguage();

  const isUnauthorized = error instanceof ApiError && error.status === 401;
  const status: AuthStatus = isLoading
    ? "loading"
    : data?.user
      ? "authenticated"
      : isUnauthorized
        ? "unauthenticated"
        : "unauthenticated";
  const user = data?.user || null;
  const tenantId = data?.tenant?.id || null;
  const tenantName = data?.tenant?.name || null;

  const refreshSession = useCallback(async () => {
    await mutateCurrentUser();
  }, [mutateCurrentUser]);

  const logoutAndReset = useCallback(async () => {
    try {
      await logout();
    } finally {
      await mutateCurrentUser();
    }
  }, [mutateCurrentUser]);

  const updateLanguagePreference = useCallback(async (languageCode: string) => {
    await updateMyLanguage(languageCode);
  }, [updateMyLanguage]);

  const value = useMemo(
    () => ({
      status,
      user,
      tenantId,
      tenantName,
      refreshSession,
      logoutAndReset,
      updateLanguagePreference,
    }),
    [
      status,
      user,
      tenantId,
      tenantName,
      refreshSession,
      logoutAndReset,
      updateLanguagePreference,
    ],
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
