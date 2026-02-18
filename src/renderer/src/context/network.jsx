import React, { createContext, useContext, useMemo } from "react";

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const value = useMemo(() => {
    const baseDomain = window.electron?.baseDomain || "translator.my-uam.com";
    const wsBaseUrl =
      window.electron?.wsBaseUrl || `wss://${baseDomain}`;

    return { baseDomain, wsBaseUrl };
  }, []);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
