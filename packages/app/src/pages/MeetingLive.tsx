import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../hooks/api";
import {
  useDownloadMeetingTranscript,
  useEndMeeting,
  useMeetingDetails,
  useJoinMeeting,
  useMeetingParticipants,
  type MeetingParticipant,
} from "../hooks/meeting";
import { useAuth } from "../auth/AuthContext";
import { getApiBaseUrl } from "../hooks/api";
import { getLanguageLabel } from "../languages/LanguageList";
import { useAppRoute } from "../routing/RouteContext";

type TranscriptFinalItem = {
  id: string;
  text: string;
  language: string;
  isFinal: boolean;
};

type AudioInputDevice = {
  id: string;
  label: string;
};

/**
 * Live meeting room for audio streaming and transcript updates.
 */
export function MeetingLivePage() {
  const { meeting, navigateTo } = useAppRoute();
  const { user } = useAuth();
  const isHostView = Boolean(meeting?.isHost);

  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [socketStatus, setSocketStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  const [roomSubscribed, setRoomSubscribed] = useState(false);

  const [preflightStatus, setPreflightStatus] = useState<
    "idle" | "checking" | "ready" | "error"
  >("idle");
  const [preflightMessage, setPreflightMessage] = useState<string | null>(
    "Run mic preflight before starting audio.",
  );
  const [audioInputDevices, setAudioInputDevices] = useState<
    AudioInputDevice[]
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [copyJoinStatus, setCopyJoinStatus] = useState<string | null>(null);
  const [areHostControlsVisible, setAreHostControlsVisible] = useState(true);
  const [isPreflightMonitoring, setIsPreflightMonitoring] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [downloadingLanguage, setDownloadingLanguage] = useState<string | null>(null);
  const [hasEndedMeetingLocally, setHasEndedMeetingLocally] = useState(false);
  const copyJoinResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [meetingStatusEvents, setMeetingStatusEvents] = useState<string[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptFinalItem[]>([]);
  const [isFollowEnabled, setIsFollowEnabled] = useState(true);
  const [participantsById, setParticipantsById] = useState<
    Record<string, MeetingParticipant>
  >({});

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

  const meetingCode = meeting?.readableId || "-";
  const { data: meetingDetailsData } = useMeetingDetails(
    meeting?.meetingId || null,
    Boolean(meeting),
  );
  const endMeeting = useEndMeeting();
  const downloadMeetingTranscript = useDownloadMeetingTranscript();
  const joinMeeting = useJoinMeeting();
  const { data: participantsData, isLoading: isParticipantsLoading } =
    useMeetingParticipants(meeting?.meetingId || null, Boolean(meeting));
  const meetingTopic =
    meetingDetailsData?.meeting.topic || `Room ${meetingCode}`;
  const joinUrl = meetingDetailsData?.meeting.join_url || null;
  const hasMeetingEnded =
    hasEndedMeetingLocally || Boolean(meetingDetailsData?.meeting.ended_at);

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
  }, [meeting?.meetingId]);

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

  const browser = globalThis as typeof globalThis & {
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
        if (
          currentId &&
          audioInputs.some((device) => device.id === currentId)
        ) {
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
        err instanceof Error
          ? err.message
          : "Unable to complete mic preflight.",
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
        throw new Error(
          "Microphone monitoring is not supported in this browser",
        );
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

      const AudioContextCtor =
        browser.AudioContext || browser.webkitAudioContext;
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
        err instanceof Error
          ? err.message
          : "Unable to start microphone monitoring.",
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
    browser.addEventListener?.("touchstart", revealControls, {
      passive: true,
    });
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
    language: string,
    text: string,
    isFinal: boolean,
  ) => {
    setTranscriptItems((current) => {
      const next = [...current];
      const existingIndex = next.findIndex(
        (item) => item.language === language && !item.isFinal,
      );

      if (existingIndex >= 0) {
        const existingItem = next[existingIndex]!;
        next[existingIndex] = {
          id: existingItem.id,
          language: existingItem.language,
          text,
          isFinal,
        };
      } else {
        next.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text,
          language,
          isFinal,
        });
      }

      return next.slice(-300);
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
            const text = String(translationText || parsed.text || transcriptionText || "").trim();
            const isFinal = Boolean(parsed.isFinal);
            const viewerLanguage = user?.languageCode || null;

            if (!text || !viewerLanguage || language !== viewerLanguage) {
              return;
            }

            appendTranscriptItem(language, text, isFinal);
            return;
          }

          if (parsed?.type === "presence") {
            const presenceEvent = String(parsed.event || "");

            if (
              presenceEvent === "snapshot" &&
              Array.isArray(parsed.participants)
            ) {
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
                    languageCode:
                      participant?.languageCode ||
                      next[id]?.languageCode ||
                      null,
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
                      languageCode:
                        participant.languageCode ||
                        existing?.languageCode ||
                        null,
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
          }

          if (parsed?.type === "status") {
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
        if (
          processorRef.current ||
          mediaStreamRef.current ||
          audioContextRef.current
        ) {
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

      const AudioContextCtor =
        browser.AudioContext || browser.webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser");
      }

      const audioContext = new AudioContextCtor({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      audioSourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
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

      ws.send(
        JSON.stringify({
          action: "audio_started",
        }),
      );

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
      ws.send(
        JSON.stringify({
          action: "audio_stopped",
        }),
      );
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
      return;
    }

    try {
      await browser.navigator.clipboard.writeText(joinUrl);
      setCopyJoinStatus("Join URL copied.");
      copyJoinResetTimeoutRef.current = setTimeout(() => {
        setCopyJoinStatus((current) =>
          current === "Join URL copied." ? null : current,
        );
        copyJoinResetTimeoutRef.current = null;
      }, 2000);
    } catch {
      setCopyJoinStatus("Failed to copy join URL.");
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
      setAudioStatus(
        err instanceof Error ? err.message : "Failed to end meeting.",
      );
    } finally {
      setIsEndingMeeting(false);
    }
  };

  const handleDownloadTranscript = async (language: string) => {
    if (!meeting || downloadingLanguage) {
      return;
    }

    setDownloadingLanguage(language);
    setDownloadStatus(null);

    try {
      const { blob, response } = await downloadMeetingTranscript(
        meeting.meetingId,
        language,
      );
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/i);
      const fallbackName = `${meeting.readableId}-${language}.vtt`;
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
      setDownloadStatus(`Downloaded ${getLanguageLabel(language)} transcript.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setDownloadStatus(error.message);
      } else {
        setDownloadStatus(
          error instanceof Error ? error.message : "Failed to download transcript.",
        );
      }
    } finally {
      setDownloadingLanguage(null);
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
          error instanceof Error
            ? error.message
            : "Failed to connect to the live room.",
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

  const transcriptSummary = useMemo(() => {
    const liveCount = transcriptItems.reduce((total, item) => {
      return item.isFinal ? total : total + 1;
    }, 0);
    const finalCount = transcriptItems.length - liveCount;
    return `${finalCount} final lines, ${liveCount} live`;
  }, [transcriptItems]);

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
    return participants.reduce((total, participant) => {
      return participant.isConnected ? total + 1 : total;
    }, 0);
  }, [participants]);

  const hostParticipant = useMemo(() => {
    return participants.find((participant) => participant.isHost) || null;
  }, [participants]);

  const selectedDeviceLabel = useMemo(() => {
    return (
      audioInputDevices.find((device) => device.id === selectedDeviceId)
        ?.label || "No microphone selected"
    );
  }, [audioInputDevices, selectedDeviceId]);

  const transcriptLanguageLabel = useMemo(() => {
    const meetingLanguages = meetingDetailsData?.meeting.languages || [];
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
      return getLanguageLabel(uniqueMeetingLanguages[0]);
    }

    if (uniqueMeetingLanguages.length > 1) {
      return uniqueMeetingLanguages.map((language) => getLanguageLabel(language)).join(", ");
    }

    return "Live";
  }, [meetingDetailsData?.meeting.languages, meetingDetailsData?.meeting.method, user?.languageCode]);

  const downloadableTranscriptLanguages = useMemo(() => {
    const meetingLanguages = meetingDetailsData?.meeting.languages || [];
    const dedupedLanguages = Array.from(new Set(meetingLanguages.filter(Boolean)));

    if (dedupedLanguages.length > 0) {
      return dedupedLanguages;
    }

    return user?.languageCode ? [user.languageCode] : [];
  }, [meetingDetailsData?.meeting.languages, user?.languageCode]);

  if (!meeting) {
    return (
      <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-line/80 bg-panel/90 p-6 shadow-panel">
          <p className="text-sm text-ink-muted">
            No active meeting session found. Start from Dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="mt-4 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            Back to Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`min-h-[calc(100dvh-3rem)] px-4 py-6 text-ink sm:px-6 sm:py-8 ${isHostView ? "pb-56 sm:pb-60" : ""}`}
    >
      <section
        className={`mx-auto w-full ${isHostView ? "max-w-6xl" : "max-w-5xl"}`}
      >
        <div className="relative z-20 mb-4 rounded-[28px] border border-line/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                {isHostView ? "Host Console" : "Live Transcript"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                  {meetingTopic}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  <div className="group relative z-30">
                    <span className="inline-flex rounded-full border border-line/70 bg-canvas/80 px-3 py-1.5">
                      {connectedCount} Participants
                    </span>
                    <div className="pointer-events-none absolute left-0 top-full z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line/80 bg-panel/95 p-3 opacity-0 shadow-panel backdrop-blur-xl transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                          Participants
                        </p>
                      </div>

                      {isParticipantsLoading ? (
                        <p className="mt-3 text-xs normal-case tracking-normal text-ink-muted">
                          Loading participants...
                        </p>
                      ) : participants.length === 0 ? (
                        <p className="mt-3 text-xs normal-case tracking-normal text-ink-muted">
                          No participants found.
                        </p>
                      ) : (
                        <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                          {participants.map((participant) => (
                            <div
                              key={participant.id}
                              className={`rounded-2xl border px-3 py-2 text-xs normal-case tracking-normal ${participant.isConnected ? "border-line/70 bg-canvas/80" : "border-line/60 bg-panel/70"}`}
                            >
                              <p className="truncate font-semibold text-ink">
                                {participant.name ||
                                  participant.email ||
                                  participant.id}
                                {participant.isHost ? " (Host)" : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isHostView ? (
              <button
                type="button"
                onClick={() => {
                  void handleLeaveMeeting();
                }}
                className="rounded-full border border-line bg-canvas/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink transition hover:border-lime hover:text-lime"
              >
                Leave
              </button>
            ) : null}
          </div>
        </div>

        <section>
          <div className="min-w-0 rounded-[28px] border border-line/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {transcriptLanguageLabel} Transcript
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-muted">
                {downloadStatus ? (
                  <span className="rounded-full border border-line/70 bg-canvas px-3 py-1.5 text-[11px]">
                    {downloadStatus}
                  </span>
                ) : null}
                {downloadableTranscriptLanguages.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => {
                      void handleDownloadTranscript(language);
                    }}
                    disabled={Boolean(downloadingLanguage)}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingLanguage === language
                      ? `Downloading ${getLanguageLabel(language)}...`
                      : `Download ${getLanguageLabel(language)}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsFollowEnabled((value) => !value)}
                  className="rounded-full border border-line bg-canvas px-3 py-1.5 transition hover:border-lime hover:text-lime"
                >
                  {isFollowEnabled ? "Pause Follow" : "Resume Follow"}
                </button>
              </div>
            </div>

            <div
              ref={transcriptContainerRef}
              className={
                "h-[min(62vh,640px)] overflow-auto rounded-[24px] border border-line/70 bg-canvas/90 p-3 sm:p-4"
              }
            >
              {transcriptItems.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-line/80 bg-panel/60 px-6 text-center">
                  <p className="max-w-md text-sm leading-6 text-ink-muted">
                    {isHostView
                      ? "Final transcript lines appear here once you start sending audio."
                      : "The host has not started speaking yet. Live transcript lines will appear here as soon as audio begins."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transcriptItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl px-3 py-2.5 text-sm shadow-sm ${item.isFinal ? "border border-lime/35 bg-[linear-gradient(135deg,rgba(160,197,72,0.16),rgba(255,255,255,0.72))] text-ink" : "border border-line/70 bg-panel/80 text-ink-muted"}`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {getLanguageLabel(item.language)} {item.isFinal ? "final" : "live"}
                      </p>
                      <p className="mt-1 leading-6">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      {isHostView ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-3 sm:bottom-6 sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div
                className={`flex flex-col items-center gap-2 transition-all duration-300 ${areHostControlsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
              >
                <button
                  type="button"
                  onClick={() => showHostControls()}
                  className={`pointer-events-auto rounded-full border border-line/70 bg-panel/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted shadow-panel backdrop-blur-xl transition ${areHostControlsVisible ? "opacity-0" : "opacity-100 hover:border-lime hover:text-lime"}`}
                >
                  Show controls
                </button>

                <div
                  className={`rounded-[28px] border border-line/80 bg-panel/85 p-3 shadow-panel backdrop-blur-xl sm:p-4 ${areHostControlsVisible ? "pointer-events-auto" : "pointer-events-none"}`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                          Meeting controls
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleMicCheck();
                          }}
                          disabled={preflightStatus === "checking"}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isPreflightMonitoring ? "border-lime/40 bg-lime/15 text-ink" : "border-line bg-canvas/80 text-ink hover:border-lime hover:text-lime"}`}
                        >
                          {preflightStatus === "checking"
                            ? "Checking..."
                            : isPreflightMonitoring
                              ? "Stop Mic Check"
                              : "Check Mic"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyJoinUrl();
                          }}
                          disabled={!joinUrl}
                          className="rounded-full border border-line bg-canvas/80 px-4 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {copyJoinStatus === "Join URL copied."
                            ? "Copied"
                            : "Invite"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleEndMeeting();
                          }}
                          disabled={isEndingMeeting || hasMeetingEnded}
                          className="rounded-full border border-rose-300/70 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {hasMeetingEnded
                            ? "Ended"
                            : isEndingMeeting
                              ? "Ending..."
                              : "End"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <select
                          value={selectedDeviceId}
                          onChange={(event: any) =>
                            setSelectedDeviceId(String(event.target.value))
                          }
                          onFocus={() => showHostControls()}
                          disabled={audioInputDevices.length === 0}
                          className="min-w-[12rem] flex-1 rounded-full border border-line bg-canvas/80 px-4 py-2.5 text-xs text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20 md:max-w-sm"
                        >
                          {audioInputDevices.map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            void handleStopAudio();
                          }}
                          disabled={!isAudioStreaming}
                          className="rounded-full border border-line bg-canvas/80 px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mute
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleLeaveMeeting();
                          }}
                          disabled={isHostView && !hasMeetingEnded}
                          className="rounded-full border border-line bg-canvas/80 px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Leave
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleStartAudio();
                          }}
                          disabled={
                            hasMeetingEnded ||
                            isAudioStreaming ||
                            socketStatus === "connecting" ||
                            preflightStatus !== "ready"
                          }
                          className={`rounded-full px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isAudioStreaming ? "border border-lime/40 bg-lime/20 text-ink" : "border border-line bg-ink text-canvas hover:border-lime hover:bg-lime hover:text-ink"}`}
                        >
                          {socketStatus === "connecting"
                            ? "Connecting..."
                            : hasMeetingEnded
                              ? "Meeting Ended"
                            : isAudioStreaming
                              ? "Mic Live"
                              : "Join Audio"}
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-ink-muted">
                      Check your mic before going live. Bad audio quality leads to bad transcription quality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
