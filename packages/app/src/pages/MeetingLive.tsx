import { useMeetingLiveRoom } from "../hooks/useMeetingLiveRoom";
import { getLanguageLabel } from "../languages/LanguageList";
import { GrDownload } from "react-icons/gr";

/**
 * Live meeting room for audio streaming and transcript updates.
 */
export function MeetingLivePage() {
  const {
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
    downloadingLanguage,
    handleDownloadTranscript,
    downloadableSummaryLanguages,
    selectedSummaryLanguage,
    downloadingSummaryLanguage,
    handleDownloadSummary,
    isFollowEnabled,
    setIsFollowEnabled,
    transcriptContainerRef,
    transcriptItems,
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
  } = useMeetingLiveRoom();

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

              <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-ink-muted">
                {areTranscriptDisplayOptionsVisible ? (
                  <div className="flex h-10 items-center gap-1 rounded-full border border-line bg-canvas/80 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTranscriptDisplayMode("translated_only")
                      }
                      className={`rounded-full px-3 py-1.5 transition ${transcriptDisplayMode === "translated_only" ? "bg-accent text-accent-contrast" : "hover:text-lime"}`}
                    >
                      Translated only
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTranscriptDisplayMode("transcribed_only")
                      }
                      className={`rounded-full px-3 py-1.5 transition ${transcriptDisplayMode === "transcribed_only" ? "bg-accent text-accent-contrast" : "hover:text-lime"}`}
                    >
                      Transcribed only
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranscriptDisplayMode("both")}
                      className={`rounded-full px-3 py-1.5 transition ${transcriptDisplayMode === "both" ? "bg-accent text-accent-contrast" : "hover:text-lime"}`}
                    >
                      Show both
                    </button>
                  </div>
                ) : null}
                {areDownloadsVisible &&
                (downloadableTranscriptLanguages.length > 0 ||
                  downloadableSummaryLanguages.length > 0) ? (
                  <div className="flex items-center gap-2 px-2 py-2">
                    {downloadableTranscriptLanguages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleDownloadTranscript(
                            selectedTranscriptLanguage,
                          );
                        }}
                        disabled={
                          Boolean(downloadingLanguage) ||
                          !selectedTranscriptLanguage
                        }
                        className="h-10 rounded-full border border-line bg-canvas px-3 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <GrDownload
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>
                            {downloadingLanguage === selectedTranscriptLanguage
                              ? `Downloading ${getLanguageLabel(selectedTranscriptLanguage)} ...`
                              : "Transcript"}
                          </span>
                        </span>
                      </button>
                    ) : null}

                    {downloadableSummaryLanguages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleDownloadSummary(selectedSummaryLanguage);
                        }}
                        disabled={
                          Boolean(downloadingSummaryLanguage) ||
                          !selectedSummaryLanguage
                        }
                        className="h-10 rounded-full border border-line bg-canvas px-3 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <GrDownload
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>
                            {downloadingSummaryLanguage ===
                            selectedSummaryLanguage
                              ? `Downloading ${getLanguageLabel(selectedSummaryLanguage)} ...`
                              : "Summary"}
                          </span>
                        </span>
                      </button>
                    ) : null}

                    <div className="group relative">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line/80 bg-canvas text-[11px] font-semibold text-ink-muted transition group-hover:border-lime group-hover:text-lime">
                        ?
                      </span>
                      <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-line/80 bg-panel/95 p-3 text-[11px] leading-5 text-ink-muted opacity-0 shadow-panel backdrop-blur-xl transition group-hover:opacity-100">
                        Downloads use your current language setting when
                        available. Otherwise the first available language is
                        used.
                      </div>
                    </div>
                  </div>
                ) : null}
                {!hasMeetingEnded ? (
                  <button
                    type="button"
                    onClick={() => setIsFollowEnabled((value) => !value)}
                    className="h-10 rounded-full border border-line bg-canvas px-4 text-xs font-semibold text-ink transition hover:border-lime hover:text-lime"
                  >
                    {isFollowEnabled ? "Pause Follow" : "Resume Follow"}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              ref={transcriptContainerRef}
              className={
                "h-[min(62vh,640px)] app-scrollbar overflow-auto rounded-[24px] border border-line/70 bg-canvas/90 p-3 sm:p-4"
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
                      className={`px-3 py-2.5 text-sm ${item.isFinal ? "text-ink" : "text-ink-muted"}`}
                    >
                      {item.speaker ? (
                        <p className="mt-1 text-xs font-semibold text-ink-muted">
                          {item.speaker}
                        </p>
                      ) : null}
                      <p className="mt-1 leading-6">{item.primaryText}</p>
                      {item.secondaryText ? (
                        <p className="mt-1 text-xs leading-5 text-ink-muted">
                          {item.secondaryText}
                        </p>
                      ) : null}
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
                      Check your mic before going live. Bad audio quality leads
                      to bad transcription quality.
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
