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

type RouteContextValue = {
  route: AppRoute;
  meeting: MeetingRouteState | null;
  navigateTo: (route: AppRoute) => void;
  navigateToMeeting: (meeting: MeetingRouteState) => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

type RouteProviderProps = {
  children: ReactNode;
};

function resolveRouteFromHash(hashValue: string): AppRoute {
  if (hashValue.startsWith("#/meeting")) {
    return "meeting";
  }

  if (hashValue === "#/configure") {
    return "configure";
  }

  if (hashValue === "#/admin") {
    return "admin";
  }

  if (hashValue === "#/calendar") {
    return "calendar";
  }

  return "home";
}

function readMeetingFromHash(hashValue: string): MeetingRouteState | null {
  if (!hashValue.startsWith("#/meeting")) {
    return null;
  }

  const queryString = hashValue.includes("?") ? hashValue.split("?")[1] : "";
  const params = new URLSearchParams(queryString || "");
  const meetingId = params.get("meetingId");
  const readableId = params.get("readableId");
  const ticket = params.get("ticket");

  if (!meetingId || !readableId || !ticket) {
    return null;
  }

  return { meetingId, readableId, ticket };
}

function routeToHash(route: AppRoute, meeting?: MeetingRouteState | null): string {
  if (route === "meeting") {
    if (!meeting) {
      return "#/";
    }

    const params = new URLSearchParams();
    params.set("meetingId", meeting.meetingId);
    params.set("readableId", meeting.readableId);
    params.set("ticket", meeting.ticket);
    return `#/meeting?${params.toString()}`;
  }

  if (route === "admin") {
    return "#/admin";
  }

  if (route === "configure") {
    return "#/configure";
  }

  if (route === "calendar") {
    return "#/calendar";
  }

  return "#/";
}

function readCurrentLocation() {
  const browser = globalThis as typeof globalThis & {
    location?: { hash?: string };
  };
  const hashValue = browser.location?.hash || "";

  return {
    route: resolveRouteFromHash(hashValue),
    meeting: readMeetingFromHash(hashValue),
  };
}

export function RouteProvider({ children }: RouteProviderProps) {
  const initialLocation = readCurrentLocation();
  const [route, setRoute] = useState<AppRoute>(initialLocation.route);
  const [meeting, setMeeting] = useState<MeetingRouteState | null>(
    initialLocation.meeting,
  );

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      location?: { hash?: string };
      addEventListener?: (name: string, handler: () => void) => void;
      removeEventListener?: (name: string, handler: () => void) => void;
    };

    const onHashChange = () => {
      const nextHash = browser.location?.hash || "";
      setRoute(resolveRouteFromHash(nextHash));
      setMeeting(readMeetingFromHash(nextHash));
    };

    browser.addEventListener?.("hashchange", onHashChange);
    return () => {
      browser.removeEventListener?.("hashchange", onHashChange);
    };
  }, []);

  const value = useMemo<RouteContextValue>(() => {
    return {
      route,
      meeting,
      navigateTo: (nextRoute) => {
        const browser = globalThis as typeof globalThis & {
          location?: { hash?: string };
        };
        const nextHash = routeToHash(nextRoute, null);

        if (browser.location) {
          browser.location.hash = nextHash;
        }

        setRoute(nextRoute);
        if (nextRoute !== "meeting") {
          setMeeting(null);
        }
      },
      navigateToMeeting: (nextMeeting) => {
        const browser = globalThis as typeof globalThis & {
          location?: { hash?: string };
        };
        const nextHash = routeToHash("meeting", nextMeeting);

        if (browser.location) {
          browser.location.hash = nextHash;
        }

        setRoute("meeting");
        setMeeting(nextMeeting);
      },
    };
  }, [meeting, route]);

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useAppRoute() {
  const value = useContext(RouteContext);
  if (!value) {
    throw new Error("useAppRoute must be used inside RouteProvider");
  }

  return value;
}
