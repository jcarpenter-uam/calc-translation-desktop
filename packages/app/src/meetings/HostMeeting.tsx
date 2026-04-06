import { useAppRoute } from "../contexts/RouteContext";
import { useI18n } from "../contexts/UiI18nContext";

/**
 * Quick entry card that sends hosts to the full meeting configuration flow.
 */
export function HostMeeting() {
  const { navigateTo } = useAppRoute();
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {t("host.quickEntry")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{t("host.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {t("host.subtitle")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigateTo("configure")}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25"
      >
        {t("host.configure")}
      </button>
    </div>
  );
}
