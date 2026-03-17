import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMeetingParticipants,
  type MeetingParticipant,
} from "../hooks/meeting";
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
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [meetingStatusEvents, setMeetingStatusEvents] = useState<string[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<TranscriptFinalItem[]>([]);
  const [interimByLanguage, setInterimByLanguage] = useState<
    Record<string, string>
  >({});
  const [isFollowEnabled, setIsFollowEnabled] = useState(true);
  const [participantsById, setParticipantsById] = useState<
    Record<string, MeetingParticipant>
  >({});

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const audioSourceRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const outputGainRef = useRef<any>(null);
  const transcriptContainerRef = useRef<any>(null);

  const meetingCode = meeting?.readableId || "-";
  const { data: participantsData, isLoading: isParticipantsLoading } =
    useMeetingParticipants(meeting?.meetingId || null, Boolean(meeting));

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

  const teardownAudioStreaming = async () => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) {
      ws.close();
    }

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
    setSocketStatus("idle");
    setRoomSubscribed(false);
  };

  useEffect(() => {
    return () => {
      void teardownAudioStreaming();
    };
  }, []);

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
        if (currentId && audioInputs.some((device) => device.id === currentId)) {
          return currentId;
        }

        return audioInputs[0]?.id || "";
      });

      setPreflightStatus("ready");
      setPreflightMessage(`Microphone ready (${audioInputs.length} input device${audioInputs.length > 1 ? "s" : ""}).`);
      return true;
    } catch (err) {
      setPreflightStatus("error");
      setPreflightMessage(
        err instanceof Error ? err.message : "Unable to complete mic preflight.",
      );
      return false;
    }
  };

  useEffect(() => {
    void runMicPreflight(false);
  }, []);

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

    setAudioStatus("Connecting microphone and live socket...");
    setSocketStatus("connecting");

    try {
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

              setFinalTranscript((current) => [...current.slice(-299), nextItem]);
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
                    languageCode:
                      participant?.languageCode || next[id]?.languageCode || null,
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
                        participant.languageCode || existing?.languageCode || null,
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
        setSocketStatus("idle");
        setIsAudioStreaming(false);
        setRoomSubscribed(false);
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

      setSocketStatus("connected");
      setIsAudioStreaming(true);
      setAudioStatus("Microphone is live.");
      addStatusEvent("Audio stream started.");
    } catch (err) {
      await teardownAudioStreaming();
      setSocketStatus("error");
      setAudioStatus(
        err instanceof Error ? err.message : "Failed to start audio stream.",
      );
    }
  };

  const handleStopAudio = async () => {
    await teardownAudioStreaming();
    setAudioStatus("Audio stream stopped.");
    addStatusEvent("Audio stream stopped.");
  };

  const transcriptSummary = useMemo(() => {
    const interimCount = Object.keys(interimByLanguage).length;
    return `${finalTranscript.length} final lines, ${interimCount} live`; 
  }, [finalTranscript.length, interimByLanguage]);

  const interimEntries = useMemo(() => {
    return Object.entries(interimByLanguage);
  }, [interimByLanguage]);

  const selectedDeviceLabel = useMemo(() => {
    return (
      audioInputDevices.find((device) => device.id === selectedDeviceId)?.label ||
      "Not selected"
    );
  }, [audioInputDevices, selectedDeviceId]);

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
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-line/80 bg-panel/90 p-5 shadow-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Live Meeting
              </p>
              <h1 className="mt-1 text-xl font-semibold">Room {meetingCode}</h1>
            </div>
            <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
              Socket: {socketStatus}
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-line/70 bg-canvas p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Mic Preflight
            </p>
            <p className="mt-1 text-xs text-ink-muted">{preflightMessage}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void runMicPreflight(true);
                }}
                disabled={preflightStatus === "checking"}
                className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
              >
                {preflightStatus === "checking" ? "Checking..." : "Run Preflight"}
              </button>

              <select
                value={selectedDeviceId}
                onChange={(event: any) => setSelectedDeviceId(String(event.target.value))}
                disabled={audioInputDevices.length === 0}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              >
                {audioInputDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
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
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
            >
              {socketStatus === "connecting" ? "Connecting..." : "Start Audio"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleStopAudio();
              }}
              disabled={!isAudioStreaming}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stop Audio
            </button>
            <button
              type="button"
              onClick={() => navigateTo("home")}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime"
            >
              Leave Room
            </button>
          </div>

          {audioStatus ? (
            <p className="mb-4 rounded-lg border border-line/70 bg-canvas px-3 py-2 text-xs text-ink-muted">
              {audioStatus}
            </p>
          ) : null}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Transcript
            </p>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span>{transcriptSummary}</span>
              <button
                type="button"
                onClick={() => setIsFollowEnabled((value) => !value)}
                className="rounded-md border border-line px-2 py-1 transition hover:border-lime hover:text-lime"
              >
                {isFollowEnabled ? "Pause Follow" : "Resume Follow"}
              </button>
            </div>
          </div>

          {interimEntries.length > 0 ? (
            <div className="mb-2 rounded-lg border border-line/70 bg-panel p-2">
              <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Live Interim
              </p>
              <div className="space-y-1">
                {interimEntries.map(([language, text]) => (
                  <div
                    key={language}
                    className="rounded-md border border-line/70 bg-canvas px-2 py-1 text-xs text-ink-muted"
                  >
                    <span className="mr-2 font-semibold text-ink">{language}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            ref={transcriptContainerRef}
            className="h-[360px] overflow-auto rounded-xl border border-line/70 bg-canvas p-3"
          >
            {finalTranscript.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Final transcript lines appear here once audio starts.
              </p>
            ) : (
              <div className="space-y-2">
                {finalTranscript.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-lime/40 bg-lime/10 px-2 py-1.5 text-sm text-ink"
                  >
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                      {item.language} final
                    </p>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-line/80 bg-panel/90 p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Presence
          </p>
          <h2 className="mt-1 text-lg font-semibold">Room Readiness</h2>

          <div className="mt-4 space-y-2 rounded-xl border border-line/70 bg-canvas p-3">
            <p className="text-xs text-ink-muted">
              You: <span className="font-semibold text-ink">{isAudioStreaming ? "Live" : "Idle"}</span>
            </p>
            <p className="text-xs text-ink-muted">
              Subscription: <span className="font-semibold text-ink">{roomSubscribed ? "Subscribed" : "Pending"}</span>
            </p>
            <p className="text-xs text-ink-muted">
              Mic: <span className="font-semibold text-ink">{selectedDeviceLabel}</span>
            </p>
            <p className="text-xs text-ink-muted">
              Connected now: <span className="font-semibold text-ink">{connectedCount}</span>
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-line/70 bg-canvas p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Participants
            </p>

            {isParticipantsLoading ? (
              <p className="mt-2 text-xs text-ink-muted">Loading participants...</p>
            ) : participants.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">No participants found.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="rounded-lg border border-line/70 bg-panel px-2 py-1.5 text-xs"
                  >
                    <p className="font-semibold text-ink">
                      {participant.name || participant.email || participant.id}
                      {participant.isHost ? " (Host)" : ""}
                    </p>
                    <p className="text-ink-muted">
                      {participant.isConnected ? "Connected" : "Offline"} - {participant.role}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Meeting Activity
          </p>
          <h3 className="mt-1 text-base font-semibold">Status Feed</h3>

          <div className="mt-3 h-[340px] overflow-auto rounded-xl border border-line/70 bg-canvas p-3">
            {meetingStatusEvents.length === 0 ? (
              <p className="text-xs text-ink-muted">Waiting for room events...</p>
            ) : (
              <ul className="space-y-2">
                {meetingStatusEvents.map((eventMessage, index) => (
                  <li
                    key={`${eventMessage}-${index}`}
                    className="rounded-lg border border-line/70 bg-panel px-2 py-1.5 text-xs text-ink"
                  >
                    {eventMessage}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
