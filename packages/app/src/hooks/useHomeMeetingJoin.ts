import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAppRoute } from "../contexts/RouteContext";
import { ApiError } from "./api";
import { useJoinMeeting } from "./meeting";

/**
 * Normalizes user-entered meeting codes before they are sent to the backend.
 */
function normalizeReadableId(value: string) {
  return value.replace(/[\s-]/g, "").trim();
}

/**
 * Resolves a readable meeting id from either the manual field or a pasted join URL.
 */
function resolveReadableIdFromJoinInput(joinUrl: string, meetingId: string) {
  const manualId = normalizeReadableId(meetingId);
  if (manualId) {
    return manualId;
  }

  const trimmedJoinUrl = joinUrl.trim();
  if (!trimmedJoinUrl) {
    return null;
  }

  try {
    const browser = globalThis as typeof globalThis & {
      location?: { origin?: string };
    };
    const parsedUrl = new URL(trimmedJoinUrl, browser.location?.origin || "http://localhost");

    return normalizeReadableId(
      parsedUrl.searchParams.get("join") ||
        parsedUrl.searchParams.get("readableId") ||
        parsedUrl.pathname.split("/").filter(Boolean).at(-1) ||
        "",
    );
  } catch {
    return normalizeReadableId(trimmedJoinUrl);
  }
}

/**
 * Encapsulates the dashboard join flow, including deep-link auto-join behavior.
 */
export function useHomeMeetingJoin() {
  const { user } = useAuth();
  const { navigateToMeeting, route } = useAppRoute();
  const joinMeeting = useJoinMeeting();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const autoJoinAttemptRef = useRef<string | null>(null);

  const browser = globalThis as typeof globalThis & {
    location?: { search?: string };
  };

  const joinParam = useMemo(() => {
    const params = new URLSearchParams(browser.location?.search || "");
    return normalizeReadableId(params.get("join") || "");
  }, [browser.location?.search]);

  const handleJoin = async ({
    meetingId,
    joinUrl,
  }: {
    meetingId: string;
    password: string;
    joinUrl: string;
  }) => {
    const readableId = resolveReadableIdFromJoinInput(joinUrl, meetingId);
    if (!readableId) {
      setJoinError("Paste a valid join link or enter a meeting ID.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const joinedMeeting = await joinMeeting(readableId);
      navigateToMeeting({
        meetingId: joinedMeeting.meetingId,
        readableId: joinedMeeting.readableId,
        ticket: joinedMeeting.token,
        isHost: joinedMeeting.isHost,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setJoinError(error.message);
      } else if (error instanceof Error) {
        setJoinError(error.message);
      } else {
        setJoinError("Unable to join that meeting right now.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    // Deep links should auto-join only once per readable id so navigation state changes do not
    // trigger duplicate join attempts.
    if (route !== "home" || !joinParam || autoJoinAttemptRef.current === joinParam) {
      return;
    }

    autoJoinAttemptRef.current = joinParam;
    void handleJoin({
      meetingId: joinParam,
      password: "",
      joinUrl: "",
    });
  }, [joinParam, route]);

  return {
    user,
    joinError,
    isJoining,
    handleJoin,
  };
}
