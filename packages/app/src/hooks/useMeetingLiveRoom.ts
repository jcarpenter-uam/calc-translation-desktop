import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAppRoute } from "../contexts/RouteContext";
import { ApiError, getApiBaseUrl } from "./api";
import {
  useDownloadMeetingSummary,
  useDownloadMeetingTranscript,
  useEndMeeting,
  useJoinMeeting,
  useMeetingDetails,
  useMeetingParticipants,
  type MeetingParticipant,
} from "./meeting";
import { getLanguageLabel } from "../languages/LanguageList";
import {
  hasTranslatedTranscriptContent,
  renderTranscriptItem,
  upsertTranscriptItem,
  type TranscriptDisplayMode,
  type TranscriptItem,
} from "../meetings/transcriptDisplay";

type AudioInputDevice = {
  id: string;
  label: string;
};

type BrowserLike = typeof globalThis & {
  __APP_VERSION__?: string;
  console?: {
    debug?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
  };
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: { passive?: boolean },
  ) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  navigator?: {
    clipboard?: {
      writeText?: (value: string) => Promise<void>;
    };
    mediaDevices?: {
      getUserMedia?: (constraints: unknown) => Promise<any>;
      enumerateDevices?: () => Promise<any[]>;
    };
  };
  location?: {
    origin?: string;
    protocol?: string;
    host?: string;
  };
  document?: {
    body?: {
      appendChild?: (node: any) => void;
    };
    createElement?: (tagName: "a") => any;
  };
  AudioContext?: new (options?: { sampleRate?: number }) => any;
  webkitAudioContext?: new (options?: { sampleRate?: number }) => any;
};

function sanitizeDownloadFilenamePart(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const sanitized = value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || fallback;
}

function resolveTranscriptDownloadDate(value: string | null | undefined) {
  if (!value) {
    const fallback = new Date();
    return `${String(fallback.getUTCMonth() + 1).padStart(2, "0")}-${String(fallback.getUTCDate()).padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    return `${String(fallback.getUTCMonth() + 1).padStart(2, "0")}-${String(fallback.getUTCDate()).padStart(2, "0")}`;
  }

  return `${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
}

function debugLiveRoom(browser: BrowserLike, event: string, details: Record<string, unknown>) {
  browser.console?.info?.("[live-room]", event, details);
}

/**
 * Encapsulates live-room socket, transcript, presence, audio, and transcript-download state.
 */
export function useMeetingLiveRoom() {
  const { meeting, navigateTo } = useAppRoute();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const browser = globalThis as BrowserLike;
  const isHostView = Boolean(meeting?.isHost);

  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [socketStatus, setSocketStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [, setAudioStatus] = useState<string | null>(null);
  const [roomSubscribed, setRoomSubscribed] = useState(false);
  const [preflightStatus, setPreflightStatus] = useState<
    "idle" | "checking" | "ready" | "error"
  >("idle");
  const [, setPreflightMessage] = useState<string | null>(
    "Run mic preflight before starting audio.",
  );
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [copyJoinStatus, setCopyJoinStatus] = useState<string | null>(null);
  const [areHostControlsVisible, setAreHostControlsVisible] = useState(true);
  const [isPreflightMonitoring, setIsPreflightMonitoring] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [downloadingLanguage, setDownloadingLanguage] = useState<string | null>(null);
  const [downloadingSummaryLanguage, setDownloadingSummaryLanguage] = useState<string | null>(null);
  const [areDownloadsVisible, setAreDownloadsVisible] = useState(false);
  const [availableTranscriptLanguages, setAvailableTranscriptLanguages] = useState<string[]>([]);
  const [selectedTranscriptLanguage, setSelectedTranscriptLanguage] = useState("");
  const [availableSummaryLanguages, setAvailableSummaryLanguages] = useState<string[]>([]);
  const [selectedSummaryLanguage, setSelectedSummaryLanguage] = useState("");
  const [hasEndedMeetingLocally, setHasEndedMeetingLocally] = useState(false);
  const [, setMeetingStatusEvents] = useState<string[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [transcriptDisplayMode, setTranscriptDisplayMode] =
    useState<TranscriptDisplayMode>("translated_only");
  const [isFollowEnabled, setIsFollowEnabled] = useState(true);
  const [participantsById, setParticipantsById] = useState<Record<string, MeetingParticipant>>({});

  const copyJoinResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const socketConnectPromiseRef = useRef<Promise<void> | null>(null);
  const mediaStreamRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const audioSourceRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const outputGainRef = useRef<any>(null);
  const preflightStreamRef = useRef<any>(null);
  const preflightAudioContextRef = useRef<any>(null);
  const preflightSourceRef = useRef<any>(null);
  const transcriptContainerRef = useRef<any>(null);
  const syncedRoomLanguageRef = useRef<string | null>(null);

  const meetingCode = meeting?.readableId || "-";
  const { data: meetingDetailsData } = useMeetingDetails(meeting?.meetingId || null, Boolean(meeting));
  const endMeeting = useEndMeeting();
  const downloadMeetingTranscript = useDownloadMeetingTranscript();
  const downloadMeetingSummary = useDownloadMeetingSummary();
  const joinMeeting = useJoinMeeting();
  const { data: participantsData, isLoading: isParticipantsLoading } = useMeetingParticipants(
    meeting?.meetingId || null,
    Boolean(meeting),
  );
  const meetingTopic = meetingDetailsData?.meeting.topic || `Room ${meetingCode}`;
  const joinUrl = meetingDetailsData?.meeting.join_url || null;
  const hasMeetingEnded = hasEndedMeetingLocally || Boolean(meetingDetailsData?.meeting.ended_at);

  useEffect(() => {
    if (!participantsData?.participants) {
      return;
    }

    const next: Record<string, MeetingParticipant> = {};
    for (const participant of participantsData.participants) {
      next[participant.id] = participant;
    }

    setParticipantsById(next);
  }, [participantsData?.participants]);

  useEffect(() => {
    setHasEndedMeetingLocally(false);
    setAreDownloadsVisible(false);
    setAvailableTranscriptLanguages([]);
    setSelectedTranscriptLanguage("");
    setAvailableSummaryLanguages([]);
    setSelectedSummaryLanguage("");
    setTranscriptItems([]);
    setTranscriptDisplayMode("translated_only");
    syncedRoomLanguageRef.current = null;
  }, [meeting?.meetingId]);

  useEffect(() => {
    if (!roomSubscribed) {
      syncedRoomLanguageRef.current = user?.languageCode || null;
    }
  }, [roomSubscribed, user?.languageCode]);

  useEffect(() => {
    if (!hasMeetingEnded) {
      return;
    }

    setAreDownloadsVisible(true);
  }, [hasMeetingEnded]);

  useEffect(() => {
    if (!hasMeetingEnded || availableTranscriptLanguages.length > 0) {
      return;
    }

    const fallbackLanguages = (meetingDetailsData?.meeting.transcript_languages || []).filter(
      (language): language is string => typeof language === "string" && Boolean(language),
    );

    if (fallbackLanguages.length > 0) {
      setAvailableTranscriptLanguages(Array.from(new Set(fallbackLanguages)));
    }
  }, [
    availableTranscriptLanguages.length,
    hasMeetingEnded,
    meetingDetailsData?.meeting.transcript_languages,
  ]);

  useEffect(() => {
    if (!hasMeetingEnded || availableSummaryLanguages.length > 0) {
      return;
    }

    const fallbackLanguages = (meetingDetailsData?.meeting.summary_languages || []).filter(
      (language): language is string => typeof language === "string" && Boolean(language),
    );

    if (fallbackLanguages.length > 0) {
      setAvailableSummaryLanguages(Array.from(new Set(fallbackLanguages)));
    }
  }, [
    availableSummaryLanguages.length,
    hasMeetingEnded,
    meetingDetailsData?.meeting.summary_languages,
  ]);

  useEffect(() => {
    if (availableTranscriptLanguages.length === 0) {
      if (selectedTranscriptLanguage) {
        setSelectedTranscriptLanguage("");
      }
      return;
    }

    if (user?.languageCode && availableTranscriptLanguages.includes(user.languageCode)) {
      if (selectedTranscriptLanguage !== user.languageCode) {
        setSelectedTranscriptLanguage(user.languageCode);
      }
      return;
    }

    if (!availableTranscriptLanguages.includes(selectedTranscriptLanguage)) {
      setSelectedTranscriptLanguage(availableTranscriptLanguages[0] || "");
    }
  }, [availableTranscriptLanguages, selectedTranscriptLanguage, user?.languageCode]);

  useEffect(() => {
    if (availableSummaryLanguages.length === 0) {
      if (selectedSummaryLanguage) {
        setSelectedSummaryLanguage("");
      }
      return;
    }

    if (user?.languageCode && availableSummaryLanguages.includes(user.languageCode)) {
      if (selectedSummaryLanguage !== user.languageCode) {
        setSelectedSummaryLanguage(user.languageCode);
      }
      return;
    }

    if (!availableSummaryLanguages.includes(selectedSummaryLanguage)) {
      setSelectedSummaryLanguage(availableSummaryLanguages[0] || "");
    }
  }, [availableSummaryLanguages, selectedSummaryLanguage, user?.languageCode]);

  const addStatusEvent = (message: string) => {
    setMeetingStatusEvents((current) => [message, ...current.slice(0, 19)]);
  };

  const teardownAudioInput = async () => {
    const processor = processorRef.current;
    processorRef.current = null;
    if (processor) {
      processor.disconnect();
      processor.onaudioprocess = null;
    }

    const source = audioSourceRef.current;
    audioSourceRef.current = null;
    if (source) {
      source.disconnect();
    }

    const outputGain = outputGainRef.current;
    outputGainRef.current = null;
    if (outputGain) {
      outputGain.disconnect();
    }

    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track: any) => track.stop());
    }

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) {
      await context.close();
    }

    setIsAudioStreaming(false);
  };

  const disconnectRoomSocket = () => {
    socketConnectPromiseRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    syncedRoomLanguageRef.current = null;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) {
      ws.close();
    }

    setSocketStatus("idle");
    setRoomSubscribed(false);
  };

  const teardownAudioStreaming = async () => {
    await teardownAudioInput();
    disconnectRoomSocket();
  };

  const stopPreflightMonitor = async () => {
    const source = preflightSourceRef.current;
    preflightSourceRef.current = null;
    if (source) {
      source.disconnect();
    }

    const stream = preflightStreamRef.current;
    preflightStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track: any) => track.stop());
    }

    const context = preflightAudioContextRef.current;
    preflightAudioContextRef.current = null;
    if (context) {
      await context.close();
    }

    setIsPreflightMonitoring(false);
  };

  useEffect(() => {
    if (!isFollowEnabled) {
      return;
    }

    const container = transcriptContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [transcriptItems, isFollowEnabled]);

  const runMicPreflight = async (requestPermission: boolean) => {
    setPreflightStatus("checking");
    setPreflightMessage("Checking microphone access and device readiness...");

    try {
      const mediaDevices = browser.navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia || !mediaDevices?.enumerateDevices) {
        throw new Error("Media device APIs are unavailable in this browser");
      }

      if (requestPermission) {
        const probeStream = await mediaDevices.getUserMedia({
          audio: selectedDeviceId
            ? {
                deviceId: { ideal: selectedDeviceId },
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
              }
            : true,
        });
        probeStream.getTracks().forEach((track: any) => track.stop());
      }

      const devices = await mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((device) => device?.kind === "audioinput")
        .map((device, index) => ({
          id: String(device.deviceId || `default-${index}`),
          label:
            typeof device.label === "string" && device.label.trim().length > 0
              ? device.label
              : `Microphone ${index + 1}`,
        }));

      setAudioInputDevices(audioInputs);

      if (audioInputs.length === 0) {
        setPreflightStatus("error");
        setPreflightMessage("No microphone input devices detected.");
        return false;
      }

      setSelectedDeviceId((currentId) => {
        if (currentId && audioInputs.some((device) => device.id === currentId)) {
          return currentId;
        }

        return audioInputs[0]?.id || "";
      });

      setPreflightStatus("ready");
      setPreflightMessage(
        `Microphone ready (${audioInputs.length} input device${audioInputs.length > 1 ? "s" : ""}). Verify it sounds clean before going live - weak or noisy audio causes weak transcription.`,
      );
      return true;
    } catch (err) {
      setPreflightStatus("error");
      setPreflightMessage(
        err instanceof Error ? err.message : "Unable to complete mic preflight.",
      );
      return false;
    }
  };

  const handleMicCheck = async () => {
    if (isPreflightMonitoring) {
      await stopPreflightMonitor();
      setPreflightMessage(
        "Microphone monitor stopped. If the mic sounded weak or noisy, fix it before going live because poor audio creates poor transcription.",
      );
      return;
    }

    setPreflightStatus("checking");
    setPreflightMessage(
      "Checking microphone access and opening live monitor. Headphones are recommended to avoid echo.",
    );

    try {
      const passed = await runMicPreflight(true);
      if (!passed) {
        return;
      }

      const mediaDevices = browser.navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia) {
        throw new Error("Microphone monitoring is not supported in this browser");
      }

      const stream = await mediaDevices.getUserMedia({
        audio: selectedDeviceId
          ? {
              deviceId: { ideal: selectedDeviceId },
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            }
          : {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
      });

      const AudioContextCtor = browser.AudioContext || browser.webkitAudioContext;
      if (!AudioContextCtor) {
        stream.getTracks().forEach((track: any) => track.stop());
        throw new Error("AudioContext is not supported in this browser");
      }

      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);

      preflightStreamRef.current = stream;
      preflightAudioContextRef.current = audioContext;
      preflightSourceRef.current = source;
      source.connect(audioContext.destination);

      setIsPreflightMonitoring(true);
      setPreflightStatus("ready");
      setPreflightMessage(
        "Listening to your microphone now. Use headphones if possible, and do not go live until the audio sounds clear because poor audio creates poor transcription.",
      );
    } catch (err) {
      await stopPreflightMonitor();
      setPreflightStatus("error");
      setPreflightMessage(
        err instanceof Error ? err.message : "Unable to start microphone monitoring.",
      );
    }
  };

  useEffect(() => {
    if (!isHostView) {
      setPreflightStatus("idle");
      setPreflightMessage("Viewer mode. Waiting for the host to go live.");
      return;
    }

    void runMicPreflight(false);
  }, [isHostView]);

  const showHostControls = () => {
    setAreHostControlsVisible(true);
    if (controlsHideTimeoutRef.current) {
      clearTimeout(controlsHideTimeoutRef.current);
    }

    controlsHideTimeoutRef.current = setTimeout(() => {
      setAreHostControlsVisible(false);
      controlsHideTimeoutRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    if (!isHostView) {
      setAreHostControlsVisible(true);
      if (controlsHideTimeoutRef.current) {
        clearTimeout(controlsHideTimeoutRef.current);
        controlsHideTimeoutRef.current = null;
      }
      return;
    }

    const revealControls = () => {
      showHostControls();
    };

    showHostControls();
    browser.addEventListener?.("mousemove", revealControls);
    browser.addEventListener?.("touchstart", revealControls, { passive: true });
    browser.addEventListener?.("keydown", revealControls);

    return () => {
      browser.removeEventListener?.("mousemove", revealControls);
      browser.removeEventListener?.("touchstart", revealControls);
      browser.removeEventListener?.("keydown", revealControls);
      if (controlsHideTimeoutRef.current) {
        clearTimeout(controlsHideTimeoutRef.current);
        controlsHideTimeoutRef.current = null;
      }
    };
  }, [isHostView]);

  useEffect(() => {
    return () => {
      void stopPreflightMonitor();
    };
  }, []);

  const appendTranscriptItem = (
    id: string,
    startedAtMs: number | null,
    endedAtMs: number | null,
    language: string,
    transcriptionText: string | null,
    translationText: string | null,
    sourceLanguage: string | null,
    speaker: string | null,
    isFinal: boolean,
  ) => {
    setTranscriptItems((current) => {
      return upsertTranscriptItem(current, {
        id,
        startedAtMs,
        endedAtMs,
        language,
        transcriptionText,
        translationText,
        sourceLanguage,
        speaker,
        isFinal,
      });
    });
  };

  const resolveWsUrl = (ticket: string) => {
    const pageOrigin =
      browser.location?.origin ||
      `${browser.location?.protocol === "https:" ? "https" : "http"}://${browser.location?.host || "localhost:8000"}`;
    const apiUrl = new URL(getApiBaseUrl(), pageOrigin);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${apiUrl.host}/ws?ticket=${encodeURIComponent(ticket)}`;
  };

  const convertFloatToPcm16 = (float32: Float32Array) => {
    const output = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, float32[i] || 0));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output.buffer;
  };

  const connectRoomSocket = async () => {
    if (!meeting) {
      throw new Error("No active meeting session found.");
    }

    const currentSocket = wsRef.current;
    if (currentSocket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (socketConnectPromiseRef.current) {
      await socketConnectPromiseRef.current;
      return;
    }

    setSocketStatus("connecting");

    const connectionPromise = (async () => {
      const freshJoin = await joinMeeting(meeting.readableId);
      const ws = new WebSocket(resolveWsUrl(freshJoin.token));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));

          if (parsed?.type === "transcription") {
            const language = String(parsed.language || "unknown");
            const translationText =
              typeof parsed.translationText === "string"
                ? parsed.translationText.trim()
                : "";
            const transcriptionText =
              typeof parsed.transcriptionText === "string"
                ? parsed.transcriptionText.trim()
                : "";
            const fallbackText = String(translationText || transcriptionText || "").trim();
            const speaker =
              typeof parsed.speaker === "string"
                ? parsed.speaker.trim() || null
                : null;
            const isFinal = Boolean(parsed.isFinal);
            const sourceLanguage =
              typeof parsed.sourceLanguage === "string"
                ? parsed.sourceLanguage.trim() || null
                : null;
            const viewerLanguage = syncedRoomLanguageRef.current || user?.languageCode || null;
            const isTwoWayTranscript = language === "two_way";

            if (
              !fallbackText ||
              (!isTwoWayTranscript && (!viewerLanguage || language !== viewerLanguage))
            ) {
              debugLiveRoom(browser, "transcript_filtered", {
                meetingId: meeting?.meetingId || null,
                messageLanguage: language,
                viewerLanguage,
                isTwoWayTranscript,
                hasFallbackText: Boolean(fallbackText),
                isBackfilled: Boolean(parsed.isBackfilled),
              });
              return;
            }

            debugLiveRoom(browser, "transcript_received", {
              meetingId: meeting?.meetingId || null,
              messageLanguage: language,
              viewerLanguage,
              isBackfilled: Boolean(parsed.isBackfilled),
              isHistory: Boolean(parsed.isHistory),
            });

            appendTranscriptItem(
              typeof parsed.utteranceId === "string"
                ? parsed.utteranceId
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              typeof parsed.startedAtMs === "number" && Number.isFinite(parsed.startedAtMs)
                ? parsed.startedAtMs
                : null,
              typeof parsed.endedAtMs === "number" && Number.isFinite(parsed.endedAtMs)
                ? parsed.endedAtMs
                : null,
              language,
              transcriptionText || fallbackText,
              translationText || null,
              sourceLanguage,
              speaker,
              isFinal,
            );
            return;
          }

          if (parsed?.type === "presence") {
            const presenceEvent = String(parsed.event || "");

            if (presenceEvent === "snapshot" && Array.isArray(parsed.participants)) {
              setParticipantsById((current) => {
                const next = { ...current };
                for (const participant of parsed.participants as any[]) {
                  const id = String(participant?.id || "");
                  if (!id) {
                    continue;
                  }

                  next[id] = {
                    id,
                    name: participant?.name || next[id]?.name || null,
                    email: participant?.email || next[id]?.email || null,
                    languageCode: participant?.languageCode || next[id]?.languageCode || null,
                    role: (participant?.role || next[id]?.role || "user") as
                      | "user"
                      | "tenant_admin"
                      | "super_admin",
                    isHost: Boolean(next[id]?.isHost),
                    isInvited: Boolean(next[id]?.isInvited),
                    isConnected: true,
                  };
                }

                return next;
              });
              setRoomSubscribed(true);
              return;
            }

            if (presenceEvent === "participant_joined" && parsed.participant) {
              const participant = parsed.participant as any;
              const id = String(participant.id || "");
              if (id) {
                setParticipantsById((current) => {
                  const existing = current[id];
                  return {
                    ...current,
                    [id]: {
                      id,
                      name: participant.name || existing?.name || null,
                      email: participant.email || existing?.email || null,
                      languageCode: participant.languageCode || existing?.languageCode || null,
                      role: (participant.role || existing?.role || "user") as
                        | "user"
                        | "tenant_admin"
                        | "super_admin",
                      isHost: Boolean(existing?.isHost),
                      isInvited: Boolean(existing?.isInvited),
                      isConnected: true,
                    },
                  };
                });
              }

              return;
            }

            if (presenceEvent === "participant_left" && parsed.participant) {
              const participant = parsed.participant as any;
              const id = String(participant.id || "");
              if (id) {
                setParticipantsById((current) => {
                  if (!current[id]) {
                    return current;
                  }

                  return {
                    ...current,
                    [id]: {
                      ...current[id],
                      isConnected: false,
                    },
                  };
                });
              }

              return;
            }

            if (presenceEvent === "participant_updated" && parsed.participant) {
              const participant = parsed.participant as any;
              const id = String(participant.id || "");
              if (id) {
                setParticipantsById((current) => {
                  const existing = current[id];
                  return {
                    ...current,
                    [id]: {
                      id,
                      name: participant.name || existing?.name || null,
                      email: participant.email || existing?.email || null,
                      languageCode: participant.languageCode || existing?.languageCode || null,
                      role: (participant.role || existing?.role || "user") as
                        | "user"
                        | "tenant_admin"
                        | "super_admin",
                      isHost: Boolean(existing?.isHost),
                      isInvited: Boolean(existing?.isInvited),
                      isConnected: participant.isConnected ?? existing?.isConnected ?? true,
                    },
                  };
                });
              }

              return;
            }
          }

          if (parsed?.type === "status") {
            const statusEvent = String(parsed.event || "");
            if (statusEvent === "language_switched") {
              syncedRoomLanguageRef.current =
                typeof parsed.languageCode === "string" ? parsed.languageCode : syncedRoomLanguageRef.current;
              debugLiveRoom(browser, "language_switched", {
                meetingId: parsed.meetingId || meeting?.meetingId || null,
                nextLanguage: syncedRoomLanguageRef.current,
              });
            }
            if (statusEvent === "meeting_ended") {
              const transcriptLanguages: string[] = Array.isArray(parsed.transcriptLanguages)
                ? Array.from(
                    new Set(
                      parsed.transcriptLanguages
                        .map((language: unknown) => String(language || "").trim())
                        .filter(Boolean),
                    ),
                  )
                : [];
              const summaryLanguages: string[] = Array.isArray(parsed.summaryLanguages)
                ? Array.from(
                    new Set(
                      parsed.summaryLanguages
                        .map((language: unknown) => String(language || "").trim())
                        .filter(Boolean),
                    ),
                  )
                : [];

              setHasEndedMeetingLocally(true);
              setAreDownloadsVisible(true);
              setAvailableTranscriptLanguages(transcriptLanguages);
              setAvailableSummaryLanguages(summaryLanguages);
              notify(
                transcriptLanguages.length > 0
                  ? {
                      title: "Transcript Ready",
                      message:
                        "Transcript downloads are ready. Choose a language and save the VTT file.",
                      variant: "success",
                    }
                  : {
                      title: "Meeting Ended",
                      message: "Meeting ended. Transcript files are still being prepared.",
                      variant: "info",
                    },
              );
            }

            const message = parsed.message || parsed.event || "status_update";
            addStatusEvent(String(message));
            return;
          }

          if (parsed?.status) {
            const statusText = String(parsed.status);
            if (statusText.toLowerCase().includes("subscribed")) {
              setRoomSubscribed(true);
            }
            addStatusEvent(statusText);
          }
        } catch {
          // Ignore malformed payloads in the UI.
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        socketConnectPromiseRef.current = null;
        setSocketStatus("idle");
        setRoomSubscribed(false);
        if (processorRef.current || mediaStreamRef.current || audioContextRef.current) {
          void teardownAudioInput();
          setAudioStatus("Room connection closed. Reconnect to resume audio.");
        }
      };

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("WebSocket connection timed out"));
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeoutId);
          resolve();
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("WebSocket connection failed"));
        };
      });

      syncedRoomLanguageRef.current = user?.languageCode || null;
      debugLiveRoom(browser, "subscribe_meeting", {
        meetingId: meeting.meetingId,
        viewerLanguage: syncedRoomLanguageRef.current,
      });
      ws.send(
        JSON.stringify({
          action: "subscribe_meeting",
          meetingId: meeting.meetingId,
        }),
      );

      setSocketStatus("connected");
    })();

    socketConnectPromiseRef.current = connectionPromise;

    try {
      await connectionPromise;
    } catch (error) {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        wsRef.current = null;
      }
      socketConnectPromiseRef.current = null;
      setSocketStatus("error");
      throw error;
    }
  };

  const handleStartAudio = async () => {
    if (!meeting || isAudioStreaming || hasMeetingEnded) {
      if (hasMeetingEnded) {
        setAudioStatus("This meeting has ended. Leave the room to return home.");
      }
      return;
    }

    await stopPreflightMonitor();
    if (preflightStatus !== "ready") {
      const passed = await runMicPreflight(true);
      if (!passed) {
        return;
      }
    }

    setAudioStatus("Connecting microphone...");

    try {
      await connectRoomSocket();
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("Live room socket is not connected.");
      }

      const mediaDevices = browser.navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia) {
        throw new Error("Microphone capture is not supported in this browser");
      }

      const stream = await mediaDevices.getUserMedia({
        audio: selectedDeviceId
          ? {
              deviceId: { ideal: selectedDeviceId },
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            }
          : {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
      });
      mediaStreamRef.current = stream;

      const AudioContextCtor = browser.AudioContext || browser.webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser");
      }

      const audioContext = new AudioContextCtor({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      audioSourceRef.current = source;
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      const outputGain = audioContext.createGain();
      outputGain.gain.value = 0;
      outputGainRef.current = outputGain;

      processor.onaudioprocess = (event: any) => {
        if (!wsRef.current || wsRef.current.readyState !== 1) {
          return;
        }

        const input = event.inputBuffer.getChannelData(0);
        wsRef.current.send(convertFloatToPcm16(input));
      };

      source.connect(processor);
      processor.connect(outputGain);
      outputGain.connect(audioContext.destination);
      ws.send(JSON.stringify({ action: "audio_started" }));
      setIsAudioStreaming(true);
      setAudioStatus("Microphone is live.");
      addStatusEvent("Audio stream started.");
    } catch (err) {
      await teardownAudioInput();
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        disconnectRoomSocket();
        setSocketStatus("error");
      }
      setAudioStatus(
        err instanceof Error ? err.message : "Failed to start audio stream.",
      );
    }
  };

  const handleStopAudio = async () => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "audio_stopped" }));
    }

    await teardownAudioInput();
    setAudioStatus("Audio stream stopped.");
    addStatusEvent("Audio stream stopped.");
  };

  const handleCopyJoinUrl = async () => {
    if (copyJoinResetTimeoutRef.current) {
      clearTimeout(copyJoinResetTimeoutRef.current);
      copyJoinResetTimeoutRef.current = null;
    }

    if (!joinUrl || !browser.navigator?.clipboard?.writeText) {
      setCopyJoinStatus("Copy is unavailable in this browser.");
      notify({
        title: "Invite Link",
        message: "Copy is unavailable in this browser.",
        variant: "warning",
      });
      return;
    }

    try {
      await browser.navigator.clipboard.writeText(joinUrl);
      setCopyJoinStatus("Join URL copied.");
      notify({
        title: "Invite Link",
        message: "Join URL copied.",
        variant: "success",
      });
      copyJoinResetTimeoutRef.current = setTimeout(() => {
        setCopyJoinStatus((current) => (current === "Join URL copied." ? null : current));
        copyJoinResetTimeoutRef.current = null;
      }, 2000);
    } catch {
      setCopyJoinStatus("Failed to copy join URL.");
      notify({
        title: "Invite Link",
        message: "Failed to copy join URL.",
        variant: "error",
      });
    }
  };

  const handleLeaveMeeting = async () => {
    if (isHostView && !hasMeetingEnded) {
      setAudioStatus("Hosts must end the meeting before leaving the room.");
      return;
    }

    await teardownAudioStreaming();
    navigateTo("home");
  };

  const handleEndMeeting = async () => {
    if (!meeting || isEndingMeeting || hasMeetingEnded) {
      return;
    }

    setIsEndingMeeting(true);
    try {
      await endMeeting(meeting.meetingId);
      await teardownAudioStreaming();
      setHasEndedMeetingLocally(true);
      setAudioStatus("Meeting ended. You can now leave the room.");
      addStatusEvent("Meeting ended.");
    } catch (err) {
      setAudioStatus(err instanceof Error ? err.message : "Failed to end meeting.");
    } finally {
      setIsEndingMeeting(false);
    }
  };

  const handleDownloadTranscript = async (language: string) => {
    if (!meeting || downloadingLanguage) {
      return;
    }

    setDownloadingLanguage(language);
    try {
      const { blob, response } = await downloadMeetingTranscript(meeting.meetingId, language);
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/i);
      const fallbackName = `${sanitizeDownloadFilenamePart(meetingTopic, sanitizeDownloadFilenamePart(meeting.readableId, "meeting"))}_${resolveTranscriptDownloadDate(meetingDetailsData?.meeting.ended_at || meetingDetailsData?.meeting.started_at || meetingDetailsData?.meeting.scheduled_time)}_${sanitizeDownloadFilenamePart(language, "unknown")}.vtt`;
      const downloadName = nameMatch?.[1] || fallbackName;
      const anchor = browser.document?.createElement?.("a");

      if (!anchor) {
        throw new Error("Download is not supported in this browser.");
      }

      anchor.href = objectUrl;
      anchor.download = downloadName;
      browser.document?.body?.appendChild?.(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      notify({
        title: "Transcript Downloaded",
        message: `Saved the ${getLanguageLabel(language)} transcript as a VTT file.`,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to download transcript.";
      notify({
        title: "Download Failed",
        message,
        variant: "error",
      });
    } finally {
      setDownloadingLanguage(null);
    }
  };

  const handleDownloadSummary = async (language: string) => {
    if (!meeting || downloadingSummaryLanguage) {
      return;
    }

    setDownloadingSummaryLanguage(language);
    try {
      const { blob, response } = await downloadMeetingSummary(meeting.meetingId, language);
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/i);
      const fallbackName = `${sanitizeDownloadFilenamePart(meetingTopic, sanitizeDownloadFilenamePart(meeting.readableId, "meeting"))}_${resolveTranscriptDownloadDate(meetingDetailsData?.meeting.ended_at || meetingDetailsData?.meeting.started_at || meetingDetailsData?.meeting.scheduled_time)}_${sanitizeDownloadFilenamePart(language, "unknown")}_summary.md`;
      const downloadName = nameMatch?.[1] || fallbackName;
      const anchor = browser.document?.createElement?.("a");

      if (!anchor) {
        throw new Error("Download is not supported in this browser.");
      }

      anchor.href = objectUrl;
      anchor.download = downloadName;
      browser.document?.body?.appendChild?.(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      notify({
        title: "Summary Downloaded",
        message: `Saved the ${getLanguageLabel(language)} summary as a Markdown file.`,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to download summary.";
      notify({
        title: "Download Failed",
        message,
        variant: "error",
      });
    } finally {
      setDownloadingSummaryLanguage(null);
    }
  };

  useEffect(() => {
    if (!meeting) {
      return;
    }

    setAudioStatus("Connecting to live room...");
    void connectRoomSocket().then(
      () => {
        setAudioStatus((current) =>
          current === "Connecting to live room..."
            ? "Connected to room. Start audio when ready."
            : current,
        );
      },
      (error) => {
        setAudioStatus(
          error instanceof Error ? error.message : "Failed to connect to the live room.",
        );
      },
    );

    return () => {
      if (copyJoinResetTimeoutRef.current) {
        clearTimeout(copyJoinResetTimeoutRef.current);
        copyJoinResetTimeoutRef.current = null;
      }
      void teardownAudioStreaming();
    };
  }, [meeting?.meetingId, meeting?.ticket]);

  useEffect(() => {
    if (!meeting || !roomSubscribed || hasMeetingEnded) {
      return;
    }

    const nextLanguage = user?.languageCode || null;
    if (!nextLanguage || syncedRoomLanguageRef.current === nextLanguage) {
      return;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    syncedRoomLanguageRef.current = nextLanguage;
    setTranscriptItems([]);
    debugLiveRoom(browser, "switch_language_request", {
      meetingId: meeting.meetingId,
      nextLanguage,
    });
    ws.send(
      JSON.stringify({
        action: "switch_language",
        meetingId: meeting.meetingId,
        languageCode: nextLanguage,
      }),
    );
  }, [hasMeetingEnded, meeting, roomSubscribed, user?.languageCode]);

  const participants = useMemo(() => {
    return Object.values(participantsById).sort((left, right) => {
      if (left.isHost && !right.isHost) {
        return -1;
      }
      if (!left.isHost && right.isHost) {
        return 1;
      }

      const leftLabel = (left.name || left.email || left.id).toLowerCase();
      const rightLabel = (right.name || right.email || right.id).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });
  }, [participantsById]);

  const connectedCount = useMemo(() => {
    return participants.reduce(
      (total, participant) => (participant.isConnected ? total + 1 : total),
      0,
    );
  }, [participants]);

  const transcriptLanguageLabel = useMemo(() => {
    const meetingLanguages = meetingDetailsData?.meeting.spoken_languages || [];
    const uniqueMeetingLanguages = Array.from(new Set(meetingLanguages));

    if (meetingDetailsData?.meeting.method === "two_way") {
      if (uniqueMeetingLanguages.length === 2) {
        return uniqueMeetingLanguages.map((language) => getLanguageLabel(language)).join(" <-> ");
      }

      if (uniqueMeetingLanguages.length > 0) {
        return uniqueMeetingLanguages.map((language) => getLanguageLabel(language)).join(", ");
      }
    }

    if (user?.languageCode) {
      return getLanguageLabel(user.languageCode);
    }

    if (uniqueMeetingLanguages.length === 1) {
      return getLanguageLabel(uniqueMeetingLanguages[0]!);
    }

    if (uniqueMeetingLanguages.length > 1) {
      return uniqueMeetingLanguages.map((language) => getLanguageLabel(language)).join(", ");
    }

    return "Live";
  }, [meetingDetailsData?.meeting.method, meetingDetailsData?.meeting.spoken_languages, user?.languageCode]);

  const downloadableTranscriptLanguages = useMemo(() => {
    return Array.from(new Set(availableTranscriptLanguages.filter(Boolean)));
  }, [availableTranscriptLanguages]);

  const downloadableSummaryLanguages = useMemo(() => {
    return Array.from(new Set(availableSummaryLanguages.filter(Boolean)));
  }, [availableSummaryLanguages]);

  const isOneWayViewer = !isHostView && meetingDetailsData?.meeting.method === "one_way";

  const areTranscriptDisplayOptionsVisible = useMemo(() => {
    if (!isOneWayViewer) {
      return false;
    }

    return transcriptItems.some((item) => hasTranslatedTranscriptContent(item));
  }, [isOneWayViewer, transcriptItems]);

  const renderedTranscriptItems = useMemo(() => {
    return transcriptItems.map((item) =>
      renderTranscriptItem(item, transcriptDisplayMode, user?.languageCode || null),
    );
  }, [transcriptDisplayMode, transcriptItems, user?.languageCode]);

  return {
    meeting,
    navigateTo,
    isHostView,
    meetingTopic,
    connectedCount,
    participants,
    isParticipantsLoading,
    transcriptLanguageLabel,
    areDownloadsVisible,
    downloadableTranscriptLanguages,
    selectedTranscriptLanguage,
    setSelectedTranscriptLanguage,
    downloadingLanguage,
    handleDownloadTranscript,
    downloadableSummaryLanguages,
    selectedSummaryLanguage,
    setSelectedSummaryLanguage,
    downloadingSummaryLanguage,
    handleDownloadSummary,
    isFollowEnabled,
    setIsFollowEnabled,
    transcriptContainerRef,
    transcriptItems: renderedTranscriptItems,
    transcriptDisplayMode,
    setTranscriptDisplayMode,
    areTranscriptDisplayOptionsVisible,
    hasMeetingEnded,
    areHostControlsVisible,
    showHostControls,
    handleMicCheck,
    preflightStatus,
    isPreflightMonitoring,
    handleCopyJoinUrl,
    joinUrl,
    copyJoinStatus,
    handleEndMeeting,
    isEndingMeeting,
    audioInputDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    handleStopAudio,
    handleLeaveMeeting,
    handleStartAudio,
    isAudioStreaming,
    socketStatus,
  };
}
