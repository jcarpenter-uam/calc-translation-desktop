import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../hooks/api";
import { useCreateMeeting, useJoinMeeting } from "../hooks/meeting";
import { LanguageList } from "../languages/LanguageList";
import { useAppRoute } from "../routing/RouteContext";

type MeetingMethod = "one_way" | "two_way";

type IntegrationOption = {
  value: string;
  label: string;
  description: string;
};

const INTEGRATION_OPTIONS: IntegrationOption[] = [
  {
    value: "native",
    label: "Native room",
    description: "Use our in-app room and microphone flow.",
  },
  {
    value: "zoom",
    label: "Zoom",
    description: "Track a Zoom-hosted meeting in your setup details.",
  },
];

export function ConfigureMeetingPage() {
  const { user } = useAuth();
  const { navigateTo, navigateToMeeting } = useAppRoute();
  const createMeeting = useCreateMeeting();
  const joinMeeting = useJoinMeeting();

  const [topic, setTopic] = useState("");
  const [method, setMethod] = useState<MeetingMethod>("one_way");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    user?.languageCode ? [user.languageCode] : ["en"],
  );
  const [integration, setIntegration] = useState("native");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedLanguageOptions = useMemo(() => {
    return LanguageList.filter((option) =>
      selectedLanguages.includes(option.value),
    );
  }, [selectedLanguages]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false;
    }

    if (method === "two_way") {
      return selectedLanguages.length === 2;
    }

    return true;
  }, [isSubmitting, method, selectedLanguages.length]);

  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages((current) => {
      const alreadySelected = current.includes(languageCode);

      if (method === "two_way") {
        if (alreadySelected) {
          return current.filter((value) => value !== languageCode);
        }

        if (current.length >= 2) {
          return [current[1] || current[0], languageCode].filter(
            Boolean,
          ) as string[];
        }

        return [...current, languageCode];
      }

      if (alreadySelected) {
        return current.filter((value) => value !== languageCode);
      }

      return [...current, languageCode];
    });
  };

  const handleMethodChange = (nextMethod: MeetingMethod) => {
    setMethod(nextMethod);
    setSubmitError(null);

    setSelectedLanguages((current) => {
      if (nextMethod === "two_way") {
        return current.slice(0, 2);
      }

      if (current.length > 0) {
        return current;
      }

      return user?.languageCode ? [user.languageCode] : ["en"];
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (method === "two_way" && selectedLanguages.length !== 2) {
      setSubmitError(
        "Two-way meetings need exactly two languages before you can start.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createdMeeting = await createMeeting({
        topic: topic.trim() || undefined,
        method,
        languages: selectedLanguages,
        integration,
        scheduled_time: scheduledTime
          ? new Date(scheduledTime).toISOString()
          : undefined,
      });

      const joinedMeeting = await joinMeeting(createdMeeting.readableId);

      navigateToMeeting({
        meetingId: joinedMeeting.meetingId,
        readableId: joinedMeeting.readableId,
        ticket: joinedMeeting.token,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to create and start the meeting.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40" />

        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Host Setup
              </p>
              <h1 className="text-2xl font-semibold">Configure your meeting</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Set the translation mode, language coverage, and room details,
                then jump straight into the live session.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo("home")}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Meeting Basics
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    Name and source
                  </h2>
                </div>

                <div className="grid gap-4">
                  <label htmlFor="meeting-topic" className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Meeting title
                    </span>
                    <input
                      id="meeting-topic"
                      type="text"
                      value={topic}
                      onChange={(event: any) =>
                        setTopic(String(event.currentTarget.value))
                      }
                      placeholder="Customer onboarding kickoff"
                      className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                    />
                  </label>

                  <label
                    htmlFor="meeting-scheduled-time"
                    className="block space-y-2"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Scheduled time
                    </span>
                    <input
                      id="meeting-scheduled-time"
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(event: any) =>
                        setScheduledTime(String(event.currentTarget.value))
                      }
                      className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                    />
                    <p className="text-xs text-ink-muted">
                      Optional metadata for planning and list views. Starting
                      the room still happens when you enter it.
                    </p>
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Meeting source
                    </span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {INTEGRATION_OPTIONS.map((option) => {
                        const isActive = option.value === integration;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setIntegration(option.value)}
                            className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                              isActive
                                ? "border-lime bg-lime/10 text-ink"
                                : "border-line bg-panel text-ink-muted hover:border-lime hover:text-ink"
                            }`}
                          >
                            <p className="text-sm font-semibold">
                              {option.label}
                            </p>
                            <p className="mt-1 text-xs">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Translation Setup
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-ink">
                      Pick mode and languages
                    </h2>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleMethodChange("one_way")}
                    className={`rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                      method === "one_way"
                        ? "border-lime bg-lime/10"
                        : "border-line bg-panel hover:border-lime"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">
                      One-way translation
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Choose up to five spoken languages, viewers can view
                      translations in any language they wish.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMethodChange("two_way")}
                    className={`rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                      method === "two_way"
                        ? "border-lime bg-lime/10"
                        : "border-line bg-panel hover:border-lime"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">
                      Two-way translation
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Open a bilingual room that only translates between two
                      selected languages.
                    </p>
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-line/70 bg-panel/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Languages
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {method === "two_way"
                          ? "Select the two languages people will speak in the room."
                          : "Select up to five languages that people will speak in the room."}
                      </p>
                    </div>
                    <div className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-ink-muted">
                      {selectedLanguages.length} selected
                    </div>
                  </div>

                  {selectedLanguageOptions.length > 0 ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedLanguageOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleLanguage(option.value)}
                          className="rounded-full border border-lime/50 bg-lime/10 px-3 py-1 text-xs font-semibold text-ink transition hover:border-lime hover:bg-lime/15"
                        >
                          {option.label} x
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid max-h-[20rem] gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                    {LanguageList.map((option) => {
                      const isSelected = selectedLanguages.includes(
                        option.value,
                      );

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleLanguage(option.value)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                            isSelected
                              ? "border-lime bg-lime/10 text-ink"
                              : "border-line bg-canvas text-ink-muted hover:border-lime hover:text-ink"
                          }`}
                        >
                          <span className="font-semibold">{option.label}</span>
                          <span className="ml-2 text-xs uppercase">
                            {option.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {submitError ? (
                <div className="rounded-2xl border border-amber-300/70 bg-amber-100/60 px-4 py-3 text-sm text-amber-950">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Creating meeting..."
                    : "Create meeting and enter room"}
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("home")}
                  className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
