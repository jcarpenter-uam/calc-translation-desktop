import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import log from "electron-log/renderer";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    log.info("Auth: Checking current desktop session");
    try {
      const response = await window.electron.getUser();

      if (response.status === "ok" && response.data) {
        log.info("Auth: User session restored", {
          userId: response.data.id || null,
          isAdmin: Boolean(response.data.is_admin),
        });
        setUser(response.data);
      } else {
        throw new Error(response.message || "Not authenticated");
      }
    } catch (error) {
      if (error.message && !error.message.includes("401")) {
        log.warn("Auth: Session check failed", error.message);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      log.info("Auth: Logging out current user", {
        userId: user?.id || null,
      });
      await window.electron.logout();
    } catch (error) {
      log.error("Auth: Logout failed", error);
    } finally {
      setUser(null);
      window.location.hash = "#/login";
    }
  };

  const value = { user, setUser, isLoading, logout, checkAuth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
