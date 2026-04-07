import { CalendarSection } from "../calendar/CalendarSection";
import { useI18n } from "../contexts/UiI18nContext";
import { useAppRoute } from "../contexts/RouteContext";

export function CalendarPage() {
  const { navigateTo } = useAppRoute();
  const { t } = useI18n();

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {t("nav.calendar")}
              </p>
              <h1 className="text-2xl font-semibold">{t("calendar.pageTitle")}</h1>
              <p className="mt-2 text-sm text-ink-muted">
                {t("calendar.pageSubtitle")}
              </p>
            </div>

            <button
              id="tour-calendar-back"
              type="button"
              onClick={() => navigateTo("home")}
              className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
            >
              {t("common.backToDashboard")}
            </button>
          </div>

          <div id="tour-calendar-page">
            <CalendarSection />
          </div>
        </div>
      </section>
    </main>
  );
}
