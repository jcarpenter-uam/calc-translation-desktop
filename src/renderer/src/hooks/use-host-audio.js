import { useState, useRef, useEffect } from "react";

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const SILENCE_SAMPLES = new Float32Array(4096).fill(0);
const SILENCE_PCM = floatTo16BitPCM(SILENCE_SAMPLES);
const SILENCE_BASE64 = arrayBufferToBase64(SILENCE_PCM);

export function useHostAudio(sessionId, integration, token) {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const [inputDevices, setInputDevices] = useState([]);
  const [activeMode, setActiveMode] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  const micSourceRef = useRef(null);
  const micStreamRef = useRef(null);
  const sysSourceRef = useRef(null);
  const sysStreamRef = useRef(null);

  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const isMutedRef = useRef(false);
  const isAudioInitializedRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === "audioinput");
        setInputDevices(inputs);
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener("devicechange", getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", getDevices);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !integration || !token) return;

    // const wsUrl = `wss://translator.my-uam.com/ws/transcribe/${integration}/${sessionId}?token=${token}`;
    const wsUrl = `wss://2495-158-120-147-235.ngrok-free.app/ws/transcribe/${integration}/${sessionId}?token=${token}`;
    console.log("Host connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const keepAliveInterval = setInterval(() => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        !isAudioInitializedRef.current
      ) {
        wsRef.current.send(JSON.stringify({ audio: SILENCE_BASE64 }));
      }
    }, 250);

    ws.onopen = () => {
      console.log("Host Audio WS connected");
      setStatus("connected");
    };

    ws.onerror = (err) => {
      console.error("Host Audio WS error", err);
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      stopAudio();
    };

    return () => {
      clearInterval(keepAliveInterval);
      if (ws.readyState === WebSocket.OPEN) ws.close();
      stopAudio();
    };
  }, [integration, sessionId, token]);

  useEffect(() => {
    if (isAudioInitialized && canvasRef.current && analyserRef.current) {
      drawVisualizer();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAudioInitialized, activeMode]);

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const analyser = analyserRef.current;

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 32;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (isMutedRef.current) {
        canvasCtx.fillStyle = "rgba(239, 68, 68, 0.1)";
        canvasCtx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
        return;
      }

      const barWidth = (canvas.width / bufferLength) * 0.6;
      const gap = (canvas.width / bufferLength) * 0.4;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const percent = dataArray[i] / 255;
        const barHeight = Math.max(4, percent * canvas.height);
        const y = (canvas.height - barHeight) / 2;
        canvasCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + percent * 0.7})`;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, barHeight, 10);
        canvasCtx.fill();
        x += barWidth + gap;
      }
    };
    draw();
  };

  const cleanupMedia = () => {
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (sysSourceRef.current) {
      sysSourceRef.current.disconnect();
      sysSourceRef.current = null;
    }
    if (sysStreamRef.current) {
      sysStreamRef.current.getTracks().forEach((track) => track.stop());
      sysStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  };

  const startAudio = async (selection) => {
    try {
      cleanupMedia();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const type = hasConnectedOnceRef.current
          ? "session_reconnected"
          : "session_start";
        const meta = {
          meeting_uuid: sessionId,
          streamId: "browser-guest",
          workerPid: "browser",
        };
        wsRef.current.send(JSON.stringify({ type, payload: meta }));
        hasConnectedOnceRef.current = true;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          let inputData;
          if (isMutedRef.current) {
            inputData = SILENCE_SAMPLES;
          } else {
            inputData = e.inputBuffer.getChannelData(0);
          }
          const pcmBuffer = floatTo16BitPCM(inputData);
          const base64Audio = arrayBufferToBase64(pcmBuffer);

          wsRef.current.send(JSON.stringify({ audio: base64Audio }));
        }
      };

      const setupSystem = async () => {
        const sources = await window.electron.getDesktopSources();
        const screenSource = sources[0];

        if (!screenSource) throw new Error("No screen source found");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: screenSource.id,
            },
          },
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: screenSource.id,
            },
          },
        });

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          stream.removeTrack(videoTrack);
        }

        sysStreamRef.current = stream;
        const source = ctx.createMediaStreamSource(stream);
        sysSourceRef.current = source;

        source.connect(analyser);
        source.connect(processor);
      };

      const setupMic = async (deviceId) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        micStreamRef.current = stream;
        const source = ctx.createMediaStreamSource(stream);
        micSourceRef.current = source;

        source.connect(analyser);
        source.connect(processor);
      };

      if (selection === "system") {
        await setupSystem();
      } else if (selection === "both") {
        await Promise.all([setupSystem(), setupMic(undefined)]);
      } else {
        await setupMic(selection);
      }

      processor.connect(ctx.destination);

      setActiveMode(selection);
      setIsAudioInitialized(true);
      isAudioInitializedRef.current = true;
      setIsMuted(false);
      isMutedRef.current = false;
    } catch (err) {
      console.error("Failed to start audio", err);
      alert("Could not access audio device: " + err.message);
      stopAudio();
    }
  };

  const stopAudio = () => {
    cleanupMedia();
    setIsAudioInitialized(false);
    isAudioInitializedRef.current = false;
    setActiveMode(null);
  };

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    isMutedRef.current = nextState;
  };

  const disconnectSession = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "session_end" }));
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User ended session");
    }
    stopAudio();
    setStatus("disconnected");
  };

  return {
    isAudioInitialized,
    isMuted,
    status,
    canvasRef,
    startAudio,
    toggleMute,
    disconnectSession,
    inputDevices,
    activeMode,
  };
}
