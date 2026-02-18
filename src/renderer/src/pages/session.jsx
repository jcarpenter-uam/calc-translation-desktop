import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import DownloadVttButton from "../components/session/vtt-download.jsx";
import Transcript from "../components/session/transcript.jsx";
import Unauthorized from "../components/auth/unauthorized.jsx";
import Notification from "../components/misc/notification.jsx";
import BackfillLoading from "../components/session/backfill-loading.jsx";
import WaitingRoom from "../components/session/waiting.jsx";
import HostAudioSender from "../components/session/host-audio-sender.jsx";
import SessionEndedPanel from "../components/session/session-ended-panel.jsx";
import { useTranscriptStream } from "../hooks/use-transcript-stream.js";
import { useSmartScroll } from "../hooks/use-smart-scroll.js";
import { useSessionRoute } from "../hooks/use-session-route.js";
import { useLanguage } from "../context/language.jsx";
import { useNetwork } from "../context/network.jsx";
import { useTranslation } from "react-i18next";
import { useHostAudio } from "../hooks/use-host-audio.js";

export default function SessionPage() {
  const { integration, sessionId, token } = useSessionRoute();
  const navigate = useNavigate();
  const location = useLocation();
  const { wsBaseUrl } = useNetwork();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const isHost = query.get("isHost") === "true";
  const joinUrl = location.state?.joinUrl;

  const [isAuthorized, setIsAuthorized] = useState(!!token);
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const { targetLanguage } = useLanguage();
  const [restoredSession, setRestoredSession] = useState(null);
  const { t } = useTranslation();

  const hostAudioProps = useHostAudio(
    isHost ? sessionId : null,
    isHost ? integration : null,
    token,
  );

  const handleAuthFailure = useCallback(() => {
    setIsAuthorized(false);
    setShowUnauthorized(true);
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      setShowUnauthorized(true);
      const timer = setTimeout(() => {
        navigate("/");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isAuthorized, navigate]);

  const encodedSessionId = isAuthorized ? encodeURIComponent(sessionId) : null;

  const wsUrl = isAuthorized
    ? `${wsBaseUrl}/ws/view/${integration}/${encodedSessionId}?token=${token}&language=${targetLanguage}`
    : null;

  const {
    transcripts: streamTranscripts,
    isDownloadable: streamIsDownloadable,
    isBackfilling,
    sessionStatus,
    isSharedTwoWayMode,
  } = useTranscriptStream(wsUrl, sessionId, handleAuthFailure);

  useEffect(() => {
    if (!window.electron?.onRestoreSessionData) return;

    const removeListener = window.electron.onRestoreSessionData((data) => {
      if (data.sessionId === sessionId) {
        setRestoredSession(data);
      }
    });

    return () => {
      removeListener();
    };
  }, [sessionId]);

  const transcripts = restoredSession
    ? restoredSession.transcripts
    : streamTranscripts;
  const isDownloadable = restoredSession ? true : streamIsDownloadable;

  const lastTopTextRef = React.useRef(null);
  const scrollDependencies = useMemo(() => {
    return [transcripts, isDownloadable];
  }, [transcripts, isDownloadable]);
  const notification = useSmartScroll(scrollDependencies, lastTopTextRef);

  if (showUnauthorized) {
    return <Unauthorized message={t("access_denied_session_message")} />;
  }

  if (!isAuthorized) {
    return null;
  }

  if (sessionStatus === "waiting" && !isHost) {
    return (
      <div className="max-w-3xl mx-auto w-full">
        <WaitingRoom />
      </div>
    );
  }

  return (
    <>
      <div className="w-full pb-6 px-4">
        {isHost && (
          <HostAudioSender {...hostAudioProps} joinUrl={joinUrl} />
        )}

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
            topTextRef={lastTopTextRef}
            title={t("meeting_ended")}
            description={t("meeting_ended_description")}
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
      <Notification
        message={notification.message}
        visible={notification.visible}
      />
    </>
  );
}
