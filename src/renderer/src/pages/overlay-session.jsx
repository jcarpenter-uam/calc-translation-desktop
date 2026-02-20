import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useTranscriptStream } from "../hooks/use-transcript-stream.js";
import { useSmartScroll } from "../hooks/use-smart-scroll.js";
import { useLanguage } from "../context/language.jsx";
import { useSessionRoute } from "../hooks/use-session-route.js";
import { useNetwork } from "../context/network.jsx";
import Transcript from "../components/session/transcript.jsx";
import Unauthorized from "../components/auth/unauthorized.jsx";
import Notification from "../components/misc/notification.jsx";
import BackfillLoading from "../components/session/backfill-loading.jsx";
import WaitingRoom from "../components/session/waiting.jsx";
import DownloadVttButton from "../components/session/vtt-download.jsx";
import SessionEndedPanel from "../components/session/session-ended-panel.jsx";
import ResizeHandles from "../components/general/resize-handles.jsx";

export default function OverlaySessionPage() {
  const { integration, sessionId, token } = useSessionRoute();
  const { wsBaseUrl } = useNetwork();

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
    ? `${wsBaseUrl}/ws/view/${integration}/${encodedSessionId}?token=${token}&language=${targetLanguage}`
    : null;

  const {
    transcripts,
    isDownloadable,
    isBackfilling,
    sessionStatus,
    isSharedTwoWayMode,
  } = useTranscriptStream(wsUrl, sessionId, handleAuthFailure);

  const handleClose = useCallback(() => {
    if (isDownloadable && transcripts.length > 0) {
      if (window.electron.syncSessionData) {
        window.electron.syncSessionData({
          sessionId,
          transcripts,
        });
      }
    }

    window.electron.closeOverlay();
  }, [isDownloadable, transcripts, sessionId]);

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
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl">
      <div
        style={{ WebkitAppRegion: "drag" }}
        className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center z-40 cursor-move group"
      >
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600 transition-colors" />
      </div>
      <button
        onClick={handleClose}
        style={{ WebkitAppRegion: "no-drag" }}
        className="cursor-pointer absolute top-2 right-2 z-50 p-2 text-zinc-500 hover:bg-red-500 hover:text-white rounded-full transition-colors backdrop-blur-sm"
      >
        <FaTimes size={14} />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-none p-4 pt-10"
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
                  forceBothLanguages={isSharedTwoWayMode}
                  preferredLanguage={targetLanguage}
                />
              ))}

            {isDownloadable && (
              <SessionEndedPanel
                variant="compact"
                topTextRef={lastTopTextRef}
                title={t("meeting_ended")}
              >
                <DownloadVttButton
                  isDownloadable={isDownloadable}
                  integration={integration}
                  sessionId={sessionId}
                  token={token}
                />
              </SessionEndedPanel>
            )}
          </div>
        )}
      </div>

      <Notification
        message={notification.message}
        visible={notification.visible}
      />
      <ResizeHandles />
    </div>
  );
}
