import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Transcript from "../components/transcript.jsx";
import Unauthorized from "../components/unauthorized.jsx";
import Notification from "../components/notification.jsx";
import { useTranscriptStream } from "../hooks/use-transcript-stream.js";
import { useSmartScroll } from "../hooks/use-smart-scroll.js";
import Titlebar from "../components/title/titlebar.jsx";
import { SettingsButton } from "../models/settings.jsx";
import UserAvatar from "../components/title/user.jsx";
import DownloadVttButton from "../components/title/vtt-download.jsx";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SessionPage() {
  const params = useParams();
  const integration = params.integration;
  const sessionId = params["*"];
  const navigate = useNavigate();

  const query = useQuery();
  const token = query.get("token");

  const [isAuthorized, setIsAuthorized] = useState(!!token);
  const [showUnauthorized, setShowUnauthorized] = useState(false);

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

  // TODO: Update when launched
  const wsUrl = isAuthorized
    ? `wss://translator.my-uam.com/ws/view/${integration}/${encodedSessionId}?token=${token}`
    : null;

  const { transcripts, isDownloadable } = useTranscriptStream(
    wsUrl,
    sessionId,
    handleAuthFailure,
  );

  const lastTopTextRef = React.useRef(null);
  const notification = useSmartScroll(transcripts, lastTopTextRef);

  if (showUnauthorized) {
    return (
      <Unauthorized message="You do not have permission to view this session. You will be redirected to the homepage." />
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <Titlebar>
        <UserAvatar />
        <SettingsButton />
        <DownloadVttButton
          integration={integration}
          sessionId={sessionId}
          token={token}
          isDownloadable={isDownloadable}
        />
      </Titlebar>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {transcripts.map((t, index) => (
            <Transcript
              key={t.id}
              {...t}
              topTextRef={
                index === transcripts.length - 1 ? lastTopTextRef : null
              }
            />
          ))}
        </div>
      </main>
      <Notification
        message={notification.message}
        visible={notification.visible}
      />
    </>
  );
}
