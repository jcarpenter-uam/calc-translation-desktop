import { useAppRoute } from "../contexts/RouteContext";
import { useI18n } from "../contexts/UiI18nContext";
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
  const { t } = useI18n();
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
                {t("configure.hostSetup")}
              </p>
              <h1 className="text-2xl font-semibold">{t("configure.title")}</h1>
              <p className="mt-2 text-sm text-ink-muted">
                {t("configure.subtitle")}
              </p>
            </div>

            <button
              id="tour-configure-back"
              type="button"
              onClick={() => navigateTo("home")}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              {t("common.backToDashboard")}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section
                id="tour-configure-basics"
                className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6"
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t("configure.meetingBasics")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    {t("configure.nameAndSource")}
                  </h2>
                </div>

                <div className="grid gap-4">
                  <label htmlFor="meeting-topic" className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("configure.meetingTitle")}
                     </span>
                    <input
                      id="meeting-topic"
                      type="text"
                      value={topic}
                      onChange={(event: any) =>
                        setTopic(String(event.currentTarget.value))
                      }
                      placeholder={t("configure.meetingTitlePlaceholder")}
                      className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                    />
                  </label>

                  <label
                    htmlFor="meeting-scheduled-time"
                    className="block space-y-2"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("configure.scheduledTime")}
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
                      {t("configure.scheduledTimeHint")}
                    </p>
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                       {t("configure.meetingSource")}
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
                               {option.value === "native"
                                 ? t("integration.native.label")
                                 : t("integration.zoom.label")}
                             </p>
                            <p className="mt-1 text-xs">
                              {option.value === "native"
                                ? t("integration.native.description")
                                : t("integration.zoom.description")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {integration === "zoom" ? (
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        {t("configure.zoomMeetingUrl")}
                      </span>
                      <input
                        type="url"
                        value={externalJoinUrl}
                        onChange={(event: any) => {
                          setExternalJoinUrl(String(event.currentTarget.value));
                          setSubmitError(null);
                        }}
                        placeholder={t("configure.zoomMeetingUrlPlaceholder")}
                        className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                      />
                      <p className="text-xs text-ink-muted">
                        {t("configure.zoomMeetingUrlHint")}
                      </p>
                    </label>
                  ) : null}
                </div>
              </section>

              <section
                id="tour-configure-translation"
                className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      {t("configure.translationSetup")}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-ink">
                      {t("configure.pickModeAndLanguages")}
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
                      {t("configure.oneWay")}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t("configure.oneWayDescription")}
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
                      {t("configure.twoWay")}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t("configure.twoWayDescription")}
                    </p>
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-line/70 bg-panel/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        {t("configure.languages")}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {method === "two_way"
                          ? t("configure.languagesTwoWay")
                          : t("configure.languagesOneWay")}
                      </p>
                    </div>
                    <div className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-ink-muted">
                      {t("configure.selectedCount", { count: selectedSpokenLanguages.length })}
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
                       {t("configure.searchLanguages")}
                     </span>
                    <input
                      id="tour-configure-language-search"
                      type="search"
                      value={languageQuery}
                      onChange={(event: any) =>
                        setLanguageQuery(String(event.currentTarget.value))
                      }
                      placeholder={t("configure.searchLanguagesPlaceholder")}
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
                        {t("configure.noLanguagesMatch", { query: languageQuery.trim() })}
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
                  id="tour-configure-create-meeting"
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? t("configure.creatingMeeting")
                    : t("configure.createMeeting")}
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("home")}
                  className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
