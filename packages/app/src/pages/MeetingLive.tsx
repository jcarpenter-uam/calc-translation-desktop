import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMeetingDetails,
  useMeetingParticipants,
  type MeetingParticipant,
} from "../hooks/meeting";
import { getLanguageLabel } from "../languages/LanguageList";
import { useAppRoute } from "../routing/RouteContext";

type TranscriptFinalItem = {
  id: string;
  text: string;
  language: string;
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
  const copyJoinResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [meetingStatusEvents, setMeetingStatusEvents] = useState<string[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<TranscriptFinalItem[]>(
    [],
  );
  const [interimByLanguage, setInterimByLanguage] = useState<
    Record<string, string>
  >({});
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
  const transcriptContainerRef = useRef<any>(null);

  const meetingCode = meeting?.readableId || "-";
  const { data: meetingDetailsData } = useMeetingDetails(
    meeting?.meetingId || null,
    Boolean(meeting),
  );
  const { data: participantsData, isLoading: isParticipantsLoading } =
    useMeetingParticipants(meeting?.meetingId || null, Boolean(meeting));
  const meetingTopic =
    meetingDetailsData?.meeting.topic || `Room ${meetingCode}`;
  const joinUrl = meetingDetailsData?.meeting.join_url || null;

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

  useEffect(() => {
    if (!isFollowEnabled) {
      return;
    }

    const container = transcriptContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [finalTranscript, isFollowEnabled]);

  const browser = globalThis as typeof globalThis & {
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
      protocol?: string;
      host?: string;
    };
    AudioContext?: new (options?: { sampleRate?: number }) => any;
    webkitAudioContext?: new (options?: { sampleRate?: number }) => any;
  };

  const runMicPreflight = async (requestPermission: boolean) => {
    setPreflightStatus("checking");
    setPreflightMessage("Checking microphone access...");

    try {
      const mediaDevices = browser.navigator?.mediaDevices;
      if (!mediaDevices?.getUserMedia || !mediaDevices?.enumerateDevices) {
        throw new Error("Media device APIs are unavailable in this browser");
      }

      if (requestPermission) {
        const probeStream = await mediaDevices.getUserMedia({
          audio: true,
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
        `Microphone ready (${audioInputs.length} input device${audioInputs.length > 1 ? "s" : ""}).`,
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

  useEffect(() => {
    if (!isHostView) {
      setPreflightStatus("idle");
      setPreflightMessage("Viewer mode. Waiting for the host to go live.");
      return;
    }

    void runMicPreflight(false);
  }, [isHostView]);

  const resolveWsUrl = (ticket: string) => {
    const protocol = browser.location?.protocol === "https:" ? "wss" : "ws";
    const host = browser.location?.host || "localhost:8000";
    return `${protocol}://${host}/ws?ticket=${encodeURIComponent(ticket)}`;
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
      const ws = new WebSocket(resolveWsUrl(meeting.ticket));
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));

          if (parsed?.type === "transcription") {
            const language = String(parsed.language || "unknown");
            const text = String(parsed.text || "").trim();
            const isFinal = Boolean(parsed.isFinal);

            if (!text) {
              return;
            }

            if (isFinal) {
              const nextItem: TranscriptFinalItem = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                text,
                language,
              };

              setFinalTranscript((current) => [
                ...current.slice(-299),
                nextItem,
              ]);
              setInterimByLanguage((current) => {
                const next = { ...current };
                delete next[language];
                return next;
              });
              return;
            }

            setInterimByLanguage((current) => ({
              ...current,
              [language]: text,
            }));
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
    if (!meeting || isAudioStreaming) {
      return;
    }

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
    const interimCount = Object.keys(interimByLanguage).length;
    return `${finalTranscript.length} final lines, ${interimCount} live`;
  }, [finalTranscript.length, interimByLanguage]);

  const interimEntries = useMemo(() => {
    return Object.entries(interimByLanguage);
  }, [interimByLanguage]);

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
    <main className="min-h-[calc(100dvh-3rem)] px-4 py-6 text-ink sm:px-6 sm:py-8">
      <section
        className={`mx-auto w-full ${isHostView ? "max-w-6xl" : "max-w-5xl"}`}
      >
        <div className="mb-4 rounded-[28px] border border-line/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                {isHostView ? "Host Console" : "Live Transcript"}
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {meetingTopic}
              </h1>
            </div>
          </div>

          {isHostView ? (
            <div className="mt-5 rounded-[24px] border border-line/70 bg-canvas/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Controls
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    Start or pause audio, switch microphones, and copy the join
                    link for anyone you want to bring into the room.
                  </p>
                </div>

                <div className="rounded-2xl border border-line/70 bg-panel px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Mic source
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void runMicPreflight(true);
                      }}
                      disabled={preflightStatus === "checking"}
                      className="rounded-full border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {preflightStatus === "checking"
                        ? "Checking..."
                        : "Run Preflight"}
                    </button>
                    <select
                      value={selectedDeviceId}
                      onChange={(event: any) =>
                        setSelectedDeviceId(String(event.target.value))
                      }
                      disabled={audioInputDevices.length === 0}
                      className="min-w-[12rem] rounded-full border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                    >
                      {audioInputDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleStartAudio();
                    }}
                    disabled={
                      isAudioStreaming ||
                      socketStatus === "connecting" ||
                      preflightStatus !== "ready"
                    }
                    className="rounded-full border border-line bg-panel px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {socketStatus === "connecting"
                      ? "Connecting..."
                      : "Start Audio"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleStopAudio();
                    }}
                    disabled={!isAudioStreaming}
                    className="rounded-full border border-line bg-panel px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Stop Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyJoinUrl();
                    }}
                    disabled={!joinUrl}
                    className="rounded-full border border-line bg-panel px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copyJoinStatus === "Join URL copied."
                      ? "Copied"
                      : "Copy Join URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void teardownAudioStreaming().then(() =>
                        navigateTo("home"),
                      );
                    }}
                    className="rounded-full border border-line bg-panel px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime"
                  >
                    Leave Room
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <section
          className={`grid gap-4 ${isHostView ? "lg:grid-cols-[1.12fr_0.88fr]" : ""}`}
        >
          <div className="min-w-0 rounded-[28px] border border-line/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Transcript
                </p>
                <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                  {isHostView ? "Session Feed" : "What Everyone Sees"}
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span>{transcriptSummary}</span>
                <button
                  type="button"
                  onClick={() => setIsFollowEnabled((value) => !value)}
                  className="rounded-full border border-line bg-canvas px-3 py-1.5 transition hover:border-lime hover:text-lime"
                >
                  {isFollowEnabled ? "Pause Follow" : "Resume Follow"}
                </button>
              </div>
            </div>

            {interimEntries.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-line/70 bg-canvas/80 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Live Interim
                </p>
                <div className="space-y-2">
                  {interimEntries.map(([language, text]) => (
                    <div
                      key={language}
                      className="rounded-xl border border-line/70 bg-panel px-3 py-2 text-sm text-ink-muted"
                    >
                      <span className="mr-2 font-semibold text-ink">
                        {getLanguageLabel(language)}
                      </span>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              ref={transcriptContainerRef}
              className={`${isHostView ? "h-[420px]" : "h-[min(62vh,640px)]"} overflow-auto rounded-[24px] border border-line/70 bg-canvas/90 p-3 sm:p-4`}
            >
              {finalTranscript.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-line/80 bg-panel/60 px-6 text-center">
                  <p className="max-w-md text-sm leading-6 text-ink-muted">
                    {isHostView
                      ? "Final transcript lines appear here once you start sending audio."
                      : "The host has not started speaking yet. Live transcript lines will appear here as soon as audio begins."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {finalTranscript.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-lime/35 bg-[linear-gradient(135deg,rgba(160,197,72,0.16),rgba(255,255,255,0.72))] px-3 py-2.5 text-sm text-ink shadow-sm"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {getLanguageLabel(item.language)} final
                      </p>
                      <p className="mt-1 leading-6">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isHostView ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-line/70 bg-canvas/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Room status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {roomSubscribed ? "Connected" : "Joining room..."}
                  </p>
                </div>
                <div className="rounded-2xl border border-line/70 bg-canvas/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Host
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {hostParticipant?.name ||
                      hostParticipant?.email ||
                      "Waiting"}
                  </p>
                </div>
                <div className="rounded-2xl border border-line/70 bg-canvas/80 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Participants
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {connectedCount} connected
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {isHostView ? (
            <aside className="space-y-4">
              <div className="rounded-[28px] border border-line/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Participants
                </p>

                {isParticipantsLoading ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    Loading participants...
                  </p>
                ) : participants.length === 0 ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    No participants found.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {participants.map((participant) => (
                      <li
                        key={participant.id}
                        className="rounded-2xl border border-line/70 bg-canvas/80 px-3 py-2.5 text-xs"
                      >
                        <p className="font-semibold text-ink">
                          {participant.name ||
                            participant.email ||
                            participant.id}
                          {participant.isHost ? " (Host)" : ""}
                        </p>
                        <p className="mt-1 text-ink-muted">
                          {participant.isConnected ? "Connected" : "Offline"} -{" "}
                          {participant.role}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          ) : null}
        </section>
      </section>
    </main>
  );
}
