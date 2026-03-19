import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppRoute = "home" | "calendar" | "admin" | "meeting" | "configure";

export type MeetingRouteState = {
  meetingId: string;
  readableId: string;
  ticket: string;
};

type RoutingMode = "hash" | "path";

type RouteContextValue = {
  route: AppRoute;
  meeting: MeetingRouteState | null;
  navigateTo: (route: AppRoute) => void;
  navigateToMeeting: (meeting: MeetingRouteState) => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

type RouteProviderProps = {
  children: ReactNode;
  mode: RoutingMode;
};

function resolveRoute(routeValue: string): AppRoute {
  if (routeValue.startsWith("/meeting")) {
    return "meeting";
  }

  if (routeValue === "/configure") {
    return "configure";
  }

  if (routeValue === "/admin") {
    return "admin";
  }

  if (routeValue === "/calendar") {
    return "calendar";
  }

  return "home";
}

function readMeeting(routeValue: string, searchValue: string): MeetingRouteState | null {
  if (!routeValue.startsWith("/meeting")) {
    return null;
  }

  const normalizedSearch = searchValue.startsWith("?")
    ? searchValue.slice(1)
    : searchValue;
  const params = new URLSearchParams(normalizedSearch);
  const meetingId = params.get("meetingId");
  const readableId = params.get("readableId");
  const ticket = params.get("ticket");

  if (!meetingId || !readableId || !ticket) {
    return null;
  }

  return { meetingId, readableId, ticket };
}

function routeToPath(route: AppRoute, meeting?: MeetingRouteState | null): string {
  if (route === "meeting") {
    if (!meeting) {
      return "/";
    }

    const params = new URLSearchParams();
    params.set("meetingId", meeting.meetingId);
    params.set("readableId", meeting.readableId);
    params.set("ticket", meeting.ticket);
    return `/meeting?${params.toString()}`;
  }

  if (route === "admin") {
    return "/admin";
  }

  if (route === "configure") {
    return "/configure";
  }

  if (route === "calendar") {
    return "/calendar";
  }

  return "/";
}

function routeToHash(route: AppRoute, meeting?: MeetingRouteState | null): string {
  return `#${routeToPath(route, meeting)}`;
}

function readHashLocation(hashValue: string) {
  const [routeValue, searchValue = ""] = hashValue.replace(/^#/, "").split("?");
  const normalizedRouteValue = routeValue || "/";

  return {
    route: resolveRoute(normalizedRouteValue),
    meeting: readMeeting(normalizedRouteValue, searchValue),
  };
}

function readPathLocation(pathname: string, search: string) {
  return {
    route: resolveRoute(pathname || "/"),
    meeting: readMeeting(pathname || "/", search),
  };
}

function readCurrentLocation(mode: RoutingMode) {
  const browser = globalThis as typeof globalThis & {
    location?: { hash?: string; pathname?: string; search?: string };
  };

  if (mode === "path") {
    return readPathLocation(
      browser.location?.pathname || "/",
      browser.location?.search || "",
    );
  }

  return readHashLocation(browser.location?.hash || "");
}

export function RouteProvider({ children, mode }: RouteProviderProps) {
  const initialLocation = readCurrentLocation(mode);
  const [route, setRoute] = useState<AppRoute>(initialLocation.route);
  const [meeting, setMeeting] = useState<MeetingRouteState | null>(
    initialLocation.meeting,
  );

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      location?: { hash?: string; pathname?: string; search?: string };
      addEventListener?: (name: string, handler: () => void) => void;
      removeEventListener?: (name: string, handler: () => void) => void;
    };

    const syncLocation = () => {
      const nextLocation = readCurrentLocation(mode);
      setRoute(nextLocation.route);
      setMeeting(nextLocation.meeting);
    };

    const eventName = mode === "path" ? "popstate" : "hashchange";
    browser.addEventListener?.(eventName, syncLocation);

    return () => {
      browser.removeEventListener?.(eventName, syncLocation);
    };
  }, [mode]);

  const value = useMemo<RouteContextValue>(() => {
    return {
      route,
      meeting,
      navigateTo: (nextRoute) => {
        const browser = globalThis as typeof globalThis & {
          history?: { pushState?: (data: unknown, unused: string, url?: string | URL | null) => void };
          location?: { hash?: string };
        };

        if (mode === "path") {
          browser.history?.pushState?.({}, "", routeToPath(nextRoute, null));
        } else if (browser.location) {
          browser.location.hash = routeToHash(nextRoute, null);
        }

        setRoute(nextRoute);
        if (nextRoute !== "meeting") {
          setMeeting(null);
        }
      },
      navigateToMeeting: (nextMeeting) => {
        const browser = globalThis as typeof globalThis & {
          history?: { pushState?: (data: unknown, unused: string, url?: string | URL | null) => void };
          location?: { hash?: string };
        };

        if (mode === "path") {
          browser.history?.pushState?.({}, "", routeToPath("meeting", nextMeeting));
        } else if (browser.location) {
          browser.location.hash = routeToHash("meeting", nextMeeting);
        }

        setRoute("meeting");
        setMeeting(nextMeeting);
      },
    };
  }, [meeting, mode, route]);

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useAppRoute() {
  const value = useContext(RouteContext);
  if (!value) {
    throw new Error("useAppRoute must be used inside RouteProvider");
  }

  return value;
}
