import { useAppRoute } from "../contexts/RouteContext";
import {
  INTEGRATION_OPTIONS,
  MAX_ONE_WAY_SPOKEN_LANGUAGES,
  useMeetingConfigurationForm,
} from "../hooks/useMeetingConfigurationForm";

/**
 * Host configuration screen for creating a meeting and immediately joining it.
 */
export function ConfigureMeetingPage() {
  const { navigateTo } = useAppRoute();
  const {
    topic,
    setTopic,
    method,
    handleMethodChange,
    selectedSpokenLanguages,
    selectedSpokenLanguageOptions,
    filteredLanguageOptions,
    languageQuery,
    setLanguageQuery,
    integration,
    setIntegration,
    externalJoinUrl,
    setExternalJoinUrl,
    scheduledTime,
    setScheduledTime,
    isSubmitting,
    submitError,
    setSubmitError,
    canSubmit,
    toggleLanguage,
    handleSubmit,
    getLanguageFlagSrc,
  } = useMeetingConfigurationForm();

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

                  {integration === "zoom" ? (
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Zoom meeting URL
                      </span>
                      <input
                        type="url"
                        value={externalJoinUrl}
                        onChange={(event: any) => {
                          setExternalJoinUrl(String(event.currentTarget.value));
                          setSubmitError(null);
                        }}
                        placeholder="https://us02web.zoom.us/j/..."
                        className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                      />
                      <p className="text-xs text-ink-muted">
                        Required for Zoom meetings. The room cannot start until
                        a valid Zoom link is provided.
                      </p>
                    </label>
                  ) : null}
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
                      translations in any target language they wish.
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
                      selected spoken languages.
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
                          ? "Select the two spoken languages people will use in the room."
                          : "Select up to five spoken languages people will use in the room."}
                      </p>
                    </div>
                    <div className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-ink-muted">
                      {selectedSpokenLanguages.length} selected
                    </div>
                  </div>

                  {selectedSpokenLanguageOptions.length > 0 ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedSpokenLanguageOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleLanguage(option.value)}
                          className="flex items-center gap-2 rounded-full border border-lime/50 bg-lime/10 px-3 py-1 text-xs font-semibold text-ink transition hover:border-lime hover:bg-lime/15"
                        >
                          <img
                            src={getLanguageFlagSrc(option.value)}
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4 rounded-full object-cover"
                          />
                          {option.label} x
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <label className="mb-4 block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Search languages
                    </span>
                    <input
                      type="search"
                      value={languageQuery}
                      onChange={(event: any) =>
                        setLanguageQuery(String(event.currentTarget.value))
                      }
                      placeholder="Search by language or code"
                      className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                    />
                  </label>

                  <div className="app-scrollbar-language grid max-h-[20rem] gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredLanguageOptions.map((option) => {
                      const isSelected = selectedSpokenLanguages.includes(option.value);
                      const isDisabled =
                        !isSelected &&
                        ((method === "one_way" &&
                          selectedSpokenLanguages.length >= MAX_ONE_WAY_SPOKEN_LANGUAGES) ||
                          (method === "two_way" &&
                            selectedSpokenLanguages.length >= 2));

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => toggleLanguage(option.value)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                            isSelected
                              ? "border-lime bg-lime/10 text-ink"
                              : isDisabled
                                ? "cursor-not-allowed border-line/60 bg-canvas/60 text-ink-muted/70"
                                : "border-line bg-canvas text-ink-muted hover:border-lime hover:text-ink"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <img
                              src={getLanguageFlagSrc(option.value)}
                              alt=""
                              aria-hidden="true"
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <span>
                              <span className="font-semibold">
                                {option.label}
                              </span>
                              <span className="ml-2 text-xs uppercase">
                                {option.value}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}

                    {filteredLanguageOptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line bg-canvas px-4 py-6 text-sm text-ink-muted sm:col-span-2 xl:col-span-3">
                        No languages match "{languageQuery.trim()}".
                      </div>
                    ) : null}
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
