import type { CalendarEvent } from "../hooks/user";
import { useI18n } from "../contexts/UiI18nContext";

type CalendarEventsListProps = {
  events: CalendarEvent[];
};

export function CalendarEventsList({ events }: CalendarEventsListProps) {
  const { formatDateTime, formatTime, locale, t } = useI18n();
  const platformLabel: Record<CalendarEvent["platform"], string> = {
    teams: t("platform.teams"),
    google_meet: t("platform.googleMeet"),
    zoom: t("platform.zoom"),
    app: t("platform.app"),
  };

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const isCancelled = event.status === "cancelled";

        return (
          <article
            key={event.id}
            className={[
              "rounded-xl border px-4 py-3",
              isCancelled
                ? "border-rose-200 bg-rose-50/70"
                : "border-line/70 bg-panel/70",
            ].join(" ")}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={[
                      "text-sm font-semibold",
                      isCancelled ? "text-ink-muted line-through" : "text-ink",
                    ].join(" ")}
                  >
                    {event.title || t("calendar.untitled")}
                  </p>
                  {isCancelled ? (
                    <span className="w-fit rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                      {t("calendar.cancelled")}
                    </span>
                  ) : null}
                </div>
                <p className={isCancelled ? "text-xs text-rose-700/80" : "text-xs text-ink-muted"}>
                  {renderDateTimeRange(
                    startsAtLabel(t, formatDateTime, event.startsAt),
                    endsAtLabel(formatTime, event.endsAt),
                    locale,
                  )}
                </p>
              </div>
              <span className="w-fit rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">
                {platformLabel[event.platform]}
              </span>
            </div>

            {isCancelled ? (
              <p className="mt-2 text-xs font-medium text-rose-700/80">
                {t("calendar.cancelledMessage")}
              </p>
            ) : (
              <a
                href={event.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-lime transition hover:text-lime-hover"
              >
                {t("calendar.joinOn", { platform: platformLabel[event.platform] })}
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}

function startsAtLabel(
  t: (key: string) => string,
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string,
  value: string | null,
) {
  if (!value) {
    return t("calendar.timeUnavailable");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("calendar.timeUnavailable");
  }

  return formatDateTime(date, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function endsAtLabel(
  formatTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string,
  value: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatTime(date, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderDateTimeRange(startLabel: string, endLabel: string, _locale: string) {
  if (!endLabel) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
}
