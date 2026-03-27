import useSWR, { useSWRConfig } from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  languageCode: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
};

export type TenantInfo = {
  id: string;
  name: string | null;
};

export type MeResponse = {
  user: AuthUser;
  tenant: TenantInfo | null;
};

type UpdateMeResponse = {
  message: string;
  user: AuthUser;
};

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

/**
 * SWR cache key for the authenticated user payload.
 */
export const currentUserKey = () => buildApiUrl("/user/me");

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
 * Returns the authenticated user profile.
 */
export function useCurrentUser() {
  return useSWR<MeResponse, ApiError>(
    currentUserKey(),
    () => apiRequest<MeResponse>("/user/me"),
    {
      revalidateOnFocus: true,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Optimistically updates the current user's language preference.
 */
export function useUpdateMyLanguage() {
  const { cache, mutate } = useSWRConfig();

  return async (languageCode: string) => {
    const cacheKey = currentUserKey();
    const snapshot = cache.get(cacheKey)?.data as MeResponse | undefined;

    if (snapshot) {
      await mutate<MeResponse>(
        cacheKey,
        {
          ...snapshot,
          user: {
            ...snapshot.user,
            languageCode,
          },
        },
        { revalidate: false },
      );
    }

    try {
      const response = await apiRequest<UpdateMeResponse>("/user/me", {
        method: "PATCH",
        body: JSON.stringify({ languageCode }),
      });

      const latest = (cache.get(cacheKey)?.data || snapshot) as MeResponse | undefined;
      if (latest) {
        await mutate<MeResponse>(
          cacheKey,
          {
            ...latest,
            user: response.user,
          },
          { revalidate: false },
        );
      }
    } catch (error) {
      if (snapshot) {
        await mutate<MeResponse>(cacheKey, snapshot, { revalidate: false });
      }
      throw error;
    }
  };
}

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
