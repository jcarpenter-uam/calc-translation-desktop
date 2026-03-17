import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppRoute = "home" | "calendar" | "admin";

type RouteContextValue = {
  route: AppRoute;
  navigateTo: (route: AppRoute) => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

type RouteProviderProps = {
  children: ReactNode;
};

function resolveRouteFromHash(hashValue: string): AppRoute {
  if (hashValue === "#/admin") {
    return "admin";
  }

  if (hashValue === "#/calendar") {
    return "calendar";
  }

  return "home";
}

function routeToHash(route: AppRoute): string {
  if (route === "admin") {
    return "#/admin";
  }

  if (route === "calendar") {
    return "#/calendar";
  }

  return "#/";
}

function readCurrentRoute() {
  const browser = globalThis as typeof globalThis & {
    location?: { hash?: string };
  };
  return resolveRouteFromHash(browser.location?.hash || "");
}

export function RouteProvider({ children }: RouteProviderProps) {
  const [route, setRoute] = useState<AppRoute>(readCurrentRoute);

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      location?: { hash?: string };
      addEventListener?: (name: string, handler: () => void) => void;
      removeEventListener?: (name: string, handler: () => void) => void;
    };

    const onHashChange = () => {
      setRoute(resolveRouteFromHash(browser.location?.hash || ""));
    };

    browser.addEventListener?.("hashchange", onHashChange);
    return () => {
      browser.removeEventListener?.("hashchange", onHashChange);
    };
  }, []);

  const value = useMemo<RouteContextValue>(() => {
    return {
      route,
      navigateTo: (nextRoute) => {
        const browser = globalThis as typeof globalThis & {
          location?: { hash?: string };
        };
        const nextHash = routeToHash(nextRoute);

        if (browser.location) {
          browser.location.hash = nextHash;
        }

        setRoute(nextRoute);
      },
    };
  }, [route]);

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useAppRoute() {
  const value = useContext(RouteContext);
  if (!value) {
    throw new Error("useAppRoute must be used inside RouteProvider");
  }

  return value;
}
