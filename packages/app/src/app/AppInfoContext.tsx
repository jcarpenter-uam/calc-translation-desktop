import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type ClientType = "web" | "desktop";

type AppInfoContextValue = {
  clientType: ClientType;
};

const AppInfoContext = createContext<AppInfoContextValue | null>(null);

type AppInfoProviderProps = {
  clientType: ClientType;
  children: ReactNode;
};

export function AppInfoProvider({ children, clientType }: AppInfoProviderProps) {
  const value = useMemo(() => ({ clientType }), [clientType]);

  return <AppInfoContext.Provider value={value}>{children}</AppInfoContext.Provider>;
}

export function useAppInfo() {
  const value = useContext(AppInfoContext);
  if (!value) {
    throw new Error("useAppInfo must be used inside AppInfoProvider");
  }

  return value;
}
