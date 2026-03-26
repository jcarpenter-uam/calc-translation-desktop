import useSWR from "swr";
import { ApiError, apiRequest, buildApiUrl } from "./api";

export type MeetingInvitee = {
  id: string;
  name: string | null;
  email: string | null;
  languageCode: string | null;
};

type MeetingInviteesResponse = {
  invitees: MeetingInvitee[];
};

type QuickCreateMeetingResponse = {
  message: string;
  meetingId: string;
  readableId: string;
  invitedCount: number;
};

type CreateMeetingResponse = {
  message: string;
  meetingId: string;
  readableId: string;
};

type JoinMeetingResponse = {
  message: string;
  meetingId: string;
  readableId: string;
  token: string;
  isActive: boolean;
  isHost: boolean;
};

export type MeetingParticipant = {
  id: string;
  name: string | null;
  email: string | null;
  languageCode: string | null;
  role: "user" | "tenant_admin" | "super_admin";
  isHost: boolean;
  isInvited: boolean;
  isConnected: boolean;
};

type MeetingParticipantsResponse = {
  participants: MeetingParticipant[];
  connectedCount: number;
};

function buildMeetingInviteesPath(query: string, limit = 20) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  return `/meeting/invitees?${params.toString()}`;
}

/**
 * Lists tenant-scoped invite candidates for quick meeting creation.
 */
export function useMeetingInvitees(query: string, enabled: boolean) {
  const path = buildMeetingInviteesPath(query);
  const key = enabled ? buildApiUrl(path) : null;

  return useSWR<MeetingInviteesResponse, ApiError>(
    key,
    () => apiRequest<MeetingInviteesResponse>(path),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Creates an immediate meeting from title and invitees.
 */
export function useQuickCreateMeeting() {
  return async (payload: { title: string; attendeeIds: string[] }) => {
    return await apiRequest<QuickCreateMeetingResponse>("/meeting/quick-create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };
}

/**
 * Creates a configured meeting with advanced options.
 */
export function useCreateMeeting() {
  return async (payload: {
    topic?: string;
    languages?: string[];
    method?: "one_way" | "two_way";
    integration?: string;
    scheduled_time?: string;
  }) => {
    return await apiRequest<CreateMeetingResponse>("/meeting/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };
}

/**
 * Joins a meeting by readable ID and returns websocket auth ticket.
 */
export function useJoinMeeting() {
  return async (readableId: string) => {
    return await apiRequest<JoinMeetingResponse>(
      `/meeting/join/${encodeURIComponent(readableId)}`,
      {
        method: "POST",
      },
    );
  };
}

/**
 * Polls meeting participants and live connection presence.
 */
export function useMeetingParticipants(meetingId: string | null, enabled: boolean) {
  const path = meetingId ? `/meeting/${encodeURIComponent(meetingId)}/participants` : "";

  return useSWR<MeetingParticipantsResponse, ApiError>(
    enabled && meetingId ? buildApiUrl(path) : null,
    () => apiRequest<MeetingParticipantsResponse>(path),
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}
