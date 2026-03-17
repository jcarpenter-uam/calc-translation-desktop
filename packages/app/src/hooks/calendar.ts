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

export const calendarEventsKey = (limit = 8) =>
  buildApiUrl(`/user/calendar/events?limit=${limit}`);

/**
 * Reads upcoming synced calendar events for the authenticated user.
 */
export function useCalendarEvents(limit = 8, enabled = true) {
  return useSWR<CalendarEventsResponse, ApiError>(
    enabled ? calendarEventsKey(limit) : null,
    () => apiRequest<CalendarEventsResponse>(`/user/calendar/events?limit=${limit}`),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Triggers provider-backed calendar sync and refreshes cached event list.
 */
export function useSyncCalendar(limit = 8) {
  const { mutate } = useSWRConfig();

  return async () => {
    const result = await apiRequest<CalendarSyncResponse>("/user/calendar/sync", {
      method: "POST",
    });

    await mutate(calendarEventsKey(limit));
    return result;
  };
}
