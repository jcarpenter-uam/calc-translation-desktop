import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useLocation } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useTranscriptStream } from "../hooks/use-transcript-stream.js";
import { useSmartScroll } from "../hooks/use-smart-scroll.js";
import { useLanguage } from "../context/language.jsx";
import Transcript from "../components/session/transcript.jsx";
import Unauthorized from "../components/auth/unauthorized.jsx";
import Notification from "../components/misc/notification.jsx";
import BackfillLoading from "../components/session/backfill-loading.jsx";
import WaitingRoom from "../components/session/waiting.jsx";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function OverlaySessionPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    window.electron.setIgnoreMouseEvents(true, { forward: true });

    const handleMouseMove = (e) => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInside) {
        window.electron.setIgnoreMouseEvents(false);
      } else {
        window.electron.setIgnoreMouseEvents(true, { forward: true });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const params = useParams();
  const integration = params.integration;
  const sessionId = params["*"];

  const query = useQuery();
  const token = query.get("token");

  const [isAuthorized, setIsAuthorized] = useState(!!token);
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const { targetLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleAuthFailure = useCallback(() => {
    setIsAuthorized(false);
    setShowUnauthorized(true);
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      setShowUnauthorized(true);
    }
  }, [isAuthorized]);

  const encodedSessionId = isAuthorized ? encodeURIComponent(sessionId) : null;

  const wsUrl = isAuthorized
    ? `wss://translator.my-uam.com/ws/view/${integration}/${encodedSessionId}?token=${token}&language=${targetLanguage}`
    : null;

  const { transcripts, isDownloadable, isBackfilling, sessionStatus } =
    useTranscriptStream(wsUrl, sessionId, handleAuthFailure);

  const lastTopTextRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollDependencies = useMemo(() => {
    return [transcripts, isDownloadable];
  }, [transcripts, isDownloadable]);

  const notification = useSmartScroll(
    scrollDependencies,
    lastTopTextRef,
    null,
    scrollContainerRef,
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl"
    >
      <div className="absolute top-0 left-0 w-full h-12 app-region-drag z-10" />

      <button
        onClick={() => window.electron.closeOverlay()}
        className="cursor-pointer absolute top-2 right-2 z-50 p-2 text-white hover:bg-red-500 hover:text-white rounded-full app-region-no-drag transition-colors backdrop-blur-sm"
      >
        <FaTimes size={14} />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-none p-4 pt-8"
      >
        {showUnauthorized ? (
          <Unauthorized message={t("access_denied_session_message")} />
        ) : sessionStatus === "waiting" ? (
          <div className="flex items-center justify-center h-full">
            <WaitingRoom />
          </div>
        ) : (
          <div className="w-full pb-6 px-4">
            {isBackfilling && <BackfillLoading />}

            {transcripts
              .filter((t) => !isBackfilling || !t.isBackfill)
              .map((t, index, array) => (
                <Transcript
                  key={t.id}
                  {...t}
                  topTextRef={
                    !isDownloadable && index === array.length - 1
                      ? lastTopTextRef
                      : null
                  }
                />
              ))}

            {isDownloadable && (
              <div
                ref={lastTopTextRef}
                className="mt-4 p-4 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-center"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("meeting_ended")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Notification
        message={notification.message}
        visible={notification.visible}
      />
    </div>
  );
}
