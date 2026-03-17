import useSWR, { useSWRConfig } from "swr";
import { ApiError, apiRequest, buildApiUrl } from "./api";

export type CalendarEvent = {
  id: string;
  provider: "google" | "entra";
  providerEventId: string;
  title: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
  platform: "teams" | "google_meet" | "zoom" | "app";
  joinUrl: string;
  lastSyncedAt: string;
};

type CalendarEventsResponse = {
  events: CalendarEvent[];
};

type CalendarSyncResponse = {
  message: string;
  providers: Array<"google" | "entra">;
  reauthProviders: Array<"google" | "entra">;
  fetchedCount: number;
  savedCount: number;
  prunedCount: number;
};

type CalendarEventsOptions = {
  limit?: number;
  from?: string;
  enabled?: boolean;
};

function buildCalendarEventsPath({ limit = 8, from }: CalendarEventsOptions = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (from) {
    params.set("from", from);
  }

  return `/user/calendar/events?${params.toString()}`;
}

export const calendarEventsKey = (options: CalendarEventsOptions = {}) =>
  buildApiUrl(buildCalendarEventsPath(options));

/**
 * Reads upcoming synced calendar events for the authenticated user.
 */
export function useCalendarEvents(options: CalendarEventsOptions = {}) {
  const { enabled = true } = options;
  const path = buildCalendarEventsPath(options);

  return useSWR<CalendarEventsResponse, ApiError>(
    enabled ? buildApiUrl(path) : null,
    () => apiRequest<CalendarEventsResponse>(path),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Triggers provider-backed calendar sync and refreshes cached event list.
 */
export function useSyncCalendar(options: CalendarEventsOptions = {}) {
  const { mutate } = useSWRConfig();

  return async () => {
    const result = await apiRequest<CalendarSyncResponse>("/user/calendar/sync", {
      method: "POST",
    });

    await mutate(calendarEventsKey(options));
    return result;
  };
}
