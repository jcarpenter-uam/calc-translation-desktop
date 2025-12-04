import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await window.electron.getUser();

      if (response.status === "ok" && response.data) {
        setUser(response.data);
      } else {
        throw new Error(response.message || "Not authenticated");
      }
    } catch (error) {
      if (error.message && !error.message.includes("401")) {
        console.warn("Auth check failed:", error);
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
      await window.electron.logout();
    } catch (error) {
      console.error("Logout error:", error);
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
